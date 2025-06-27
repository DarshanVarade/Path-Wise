import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { generateQuestions, generateRoadmap } from '../../lib/gemini';
import { supabase } from '../../lib/supabase';
import { Target, MessageCircle, Map, CheckCircle, ArrowRight } from 'lucide-react';

const OnboardingFlow: React.FC = () => {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const handleGoalSubmit = async () => {
    if (!goal.trim()) return;
    
    setLoading(true);
    setError('');

    try {
      const generatedQuestions = await generateQuestions(goal);
      setQuestions(generatedQuestions);
      setStep(2);
    } catch (error) {
      setError('Failed to generate questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    const currentQ = questions[currentQuestion];
    setAnswers(prev => ({
      ...prev,
      [currentQ.question]: answer
    }));

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setStep(3);
    }
  };

  const handleGenerateRoadmap = async () => {
    setLoading(true);
    setError('');

    try {
      const roadmapData = await generateRoadmap(goal, answers);
      
      // Save roadmap to database
      const { data: roadmap, error: roadmapError } = await supabase
        .from('roadmaps')
        .insert({
          user_id: user!.id,
          title: `Learning Roadmap: ${goal}`,
          goal,
          weeks: roadmapData,
          questions,
          answers
        })
        .select()
        .single();

      if (roadmapError) throw roadmapError;

      // Create lessons from roadmap
      const lessons: any[] = [];
      roadmapData.forEach((week: any, weekIndex: number) => {
        week.topics.forEach((topic: any, topicIndex: number) => {
          lessons.push({
            roadmap_id: roadmap.id,
            week_number: weekIndex + 1,
            title: topic.title,
            lesson_objective: topic.lessonObjective,
            estimated_time: topic.estimatedTime,
            order_index: topicIndex
          });
        });
      });

      const { error: lessonsError } = await supabase
        .from('lessons')
        .insert(lessons);

      if (lessonsError) throw lessonsError;

      // Initialize user progress
      const { error: progressError } = await supabase
        .from('user_progress')
        .insert({
          user_id: user!.id,
          roadmap_id: roadmap.id,
          total_lessons: lessons.length,
          completed_lessons: 0,
          total_time_spent: 0,
          average_accuracy: 0,
          current_week: 1
        });

      if (progressError) throw progressError;

      // Update user profile with goal
      await updateProfile({ goal });

      navigate('/dashboard');
    } catch (error) {
      setError('Failed to generate roadmap. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <Target className="w-5 h-5" />
              <span className="text-sm font-medium">Goal</span>
            </div>
            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Questions</span>
            </div>
            <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <Map className="w-5 h-5" />
              <span className="text-sm font-medium">Roadmap</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Goal Input */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What do you want to learn?</h2>
              <p className="text-gray-600">Tell us your learning goal and we'll create a personalized roadmap for you.</p>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Learning Goal
                </label>
                <textarea
                  id="goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g., I want to become a full-stack web developer, I want to learn machine learning, I want to master React..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  rows={4}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleGoalSubmit}
                disabled={!goal.trim() || loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Questions */}
        {step === 2 && questions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Question {currentQuestion + 1} of {questions.length}
              </h2>
              <p className="text-gray-600">Help us personalize your learning experience</p>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {questions[currentQuestion]?.question}
                </h3>
                <div className="space-y-3">
                  {questions[currentQuestion]?.options?.map((option: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(option)}
                      className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between text-sm text-gray-500">
                <span>Progress: {currentQuestion + 1}/{questions.length}</span>
                <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}% complete</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Generate Roadmap */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Map className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to create your roadmap!</h2>
              <p className="text-gray-600">We'll generate a personalized learning roadmap based on your answers.</p>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Your Goal:</h3>
                <p className="text-gray-700">{goal}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Your Answers:</h3>
                <div className="space-y-2">
                  {Object.entries(answers).map(([question, answer]) => (
                    <div key={question} className="text-sm">
                      <span className="font-medium text-gray-700">{question}:</span>
                      <span className="text-gray-600 ml-2">{answer as string}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerateRoadmap}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span>Generating your roadmap...</span>
                  </>
                ) : (
                  <>
                    <span>Generate My Roadmap</span>
                    <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingFlow;