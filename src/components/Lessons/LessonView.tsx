import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Lesson } from '../../lib/supabase';
import { generateLessonContent } from '../../lib/gemini';
import { ChevronLeft, ChevronRight, Clock, Target, CheckCircle, AlertCircle } from 'lucide-react';

interface LessonContent {
  title: string;
  lessonObjective: string;
  estimatedTime: string;
  lessonContent: string;
  keyConcepts: string[];
  exampleCode: Array<{
    description: string;
    code: string;
    output: string;
  }>;
  assessmentQuestions: Array<{
    question: string;
    options: string[];
    answer: string;
  }>;
}

const LessonView: React.FC = () => {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTest, setShowTest] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [testCompleted, setTestCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    if (lessonId && user) {
      fetchLesson();
    }
  }, [lessonId, user]);

  const fetchLesson = async () => {
    try {
      // Fetch lesson details
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (lessonError) throw lessonError;
      setLesson(lessonData);

      // Fetch all lessons for navigation
      const { data: allLessonsData, error: allLessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('roadmap_id', lessonData.roadmap_id)
        .order('week_number', { ascending: true })
        .order('order_index', { ascending: true });

      if (allLessonsError) throw allLessonsError;
      setAllLessons(allLessonsData);

      // Check if lesson content exists in localStorage
      const cachedContent = localStorage.getItem(`lesson_${lessonId}`);
      if (cachedContent) {
        setLessonContent(JSON.parse(cachedContent));
      } else {
        // Generate content from AI
        const content = await generateLessonContent(lessonData);
        setLessonContent(content);
        localStorage.setItem(`lesson_${lessonId}`, JSON.stringify(content));
      }

    } catch (error) {
      console.error('Error fetching lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = () => {
    setShowTest(true);
    setCurrentQuestion(0);
    setUserAnswers([]);
    setTestCompleted(false);
  };

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = answer;
    setUserAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < lessonContent!.assessmentQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      completeTest();
    }
  };

  const completeTest = async () => {
    const questions = lessonContent!.assessmentQuestions;
    let correctAnswers = 0;

    questions.forEach((question, index) => {
      // Normalize both strings for comparison (trim whitespace and convert to lowercase)
      const userAnswer = userAnswers[index]?.trim().toLowerCase() || '';
      const correctAnswer = question.answer?.trim().toLowerCase() || '';
      
      if (userAnswer === correctAnswer) {
        correctAnswers++;
      }
    });

    const finalScore = Math.round((correctAnswers / questions.length) * 100);
    setScore(finalScore);
    setTestCompleted(true);

    // Save completion to database
    try {
      await supabase
        .from('lesson_completions')
        .upsert({
          user_id: user!.id,
          lesson_id: lessonId!,
          score: finalScore,
          time_spent: 30, // Default time, could be tracked
          answers: userAnswers,
          completed_at: new Date().toISOString()
        });

      // Update user progress with correct running average calculation
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user!.id)
        .eq('roadmap_id', lesson!.roadmap_id)
        .single();

      if (progressData) {
        // Calculate proper running average for accuracy
        const oldCompletedLessons = progressData.completed_lessons;
        const oldAverageAccuracy = progressData.average_accuracy || 0;
        const newCompletedLessons = oldCompletedLessons + 1;
        const newAverageAccuracy = (oldAverageAccuracy * oldCompletedLessons + finalScore) / newCompletedLessons;

        await supabase
          .from('user_progress')
          .update({
            completed_lessons: newCompletedLessons,
            total_time_spent: progressData.total_time_spent + 30,
            average_accuracy: newAverageAccuracy
          })
          .eq('id', progressData.id);
      }

    } catch (error) {
      console.error('Error saving completion:', error);
    }
  };

  const navigateToLesson = (direction: 'prev' | 'next') => {
    const currentIndex = allLessons.findIndex(l => l.id === lessonId);
    let targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (targetIndex >= 0 && targetIndex < allLessons.length) {
      navigate(`/lessons/${allLessons[targetIndex].id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lesson || !lessonContent) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Lesson not found</h3>
      </div>
    );
  }

  const currentIndex = allLessons.findIndex(l => l.id === lessonId);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < allLessons.length - 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Week {lesson.week_number}</span>
            <span>•</span>
            <span>Lesson {currentIndex + 1} of {allLessons.length}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{lessonContent.estimatedTime}</span>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{lessonContent.title}</h1>
        
        <div className="flex items-center space-x-2 text-blue-600">
          <Target className="w-4 h-4" />
          <span className="text-sm font-medium">{lessonContent.lessonObjective}</span>
        </div>
      </div>

      {!showTest ? (
        <>
          {/* Lesson Content */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="prose max-w-none">
              <div className="text-gray-700 leading-relaxed mb-6">
                {lessonContent.lessonContent.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>

              {/* Key Concepts */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Concepts</h3>
                <ul className="space-y-2">
                  {lessonContent.keyConcepts.map((concept, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{concept}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Example Code */}
              {lessonContent.exampleCode.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Examples</h3>
                  <div className="space-y-4">
                    {lessonContent.exampleCode.map((example, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-700">{example.description}</p>
                        </div>
                        <div className="p-4">
                          <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{example.code}</code>
                          </pre>
                          {example.output && (
                            <div className="mt-3">
                              <p className="text-sm text-gray-600 mb-2">Output:</p>
                              <div className="bg-gray-100 p-3 rounded-lg">
                                <code className="text-sm">{example.output}</code>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateToLesson('prev')}
                disabled={!canGoPrev}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={handleStartTest}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
              >
                Take Test
              </button>

              <button
                onClick={() => navigateToLesson('next')}
                disabled={!canGoNext}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Test Section */
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          {!testCompleted ? (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Question {currentQuestion + 1} of {lessonContent.assessmentQuestions.length}
                  </h3>
                  <div className="text-sm text-gray-600">
                    {Math.round(((currentQuestion + 1) / lessonContent.assessmentQuestions.length) * 100)}% Complete
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / lessonContent.assessmentQuestions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">
                  {lessonContent.assessmentQuestions[currentQuestion].question}
                </h4>
                <div className="space-y-2">
                  {lessonContent.assessmentQuestions[currentQuestion].options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(option)}
                      className={`w-full text-left p-4 border rounded-lg transition-colors ${
                        userAnswers[currentQuestion] === option
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setShowTest(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Back to Lesson
                </button>
                <button
                  onClick={handleNextQuestion}
                  disabled={!userAnswers[currentQuestion]}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {currentQuestion < lessonContent.assessmentQuestions.length - 1 ? 'Next Question' : 'Finish Test'}
                </button>
              </div>
            </>
          ) : (
            /* Test Results */
            <div className="text-center py-8">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                score >= 70 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <CheckCircle className={`w-8 h-8 ${score >= 70 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Test Complete!</h3>
              <p className="text-lg text-gray-600 mb-4">Your score: {score}%</p>
              <p className="text-sm text-gray-500 mb-6">
                {score >= 70 ? 'Great job! You can move on to the next lesson.' : 'Consider reviewing the lesson material and trying again.'}
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowTest(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Review Lesson
                </button>
                {canGoNext && (
                  <button
                    onClick={() => navigateToLesson('next')}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                  >
                    Next Lesson
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonView;