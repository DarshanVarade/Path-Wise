import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Lesson, LessonCompletion } from '../../lib/supabase';
import { BookOpen, Clock, CheckCircle, Play, Lock } from 'lucide-react';

const LessonsList: React.FC = () => {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completions, setCompletions] = useState<LessonCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchLessons();
    }
  }, [user]);

  const fetchLessons = async () => {
    try {
      setError(null);
      
      // Get user's roadmap using maybeSingle() with timeout
      const roadmapPromise = supabase
        .from('roadmaps')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      const { data: roadmapData, error: roadmapError } = await Promise.race([
        roadmapPromise,
        timeoutPromise
      ]) as any;

      if (roadmapError) {
        console.error('Roadmap error:', roadmapError);
        throw roadmapError;
      }

      // If no roadmap exists, set empty lessons and return
      if (!roadmapData) {
        setLessons([]);
        setCompletions([]);
        setLoading(false);
        return;
      }

      // Fetch lessons and completions in parallel
      const [lessonsResult, completionsResult] = await Promise.all([
        supabase
          .from('lessons')
          .select('*')
          .eq('roadmap_id', roadmapData.id)
          .order('week_number', { ascending: true })
          .order('order_index', { ascending: true }),
        supabase
          .from('lesson_completions')
          .select('*')
          .eq('user_id', user!.id)
      ]);

      if (lessonsResult.error) throw lessonsResult.error;
      if (completionsResult.error) throw completionsResult.error;

      setLessons(lessonsResult.data || []);
      setCompletions(completionsResult.data || []);

    } catch (error: any) {
      console.error('Error fetching lessons:', error);
      setError(error.message || 'Failed to load lessons');
    } finally {
      setLoading(false);
    }
  };

  const isLessonCompleted = (lessonId: string) => {
    return completions.some(completion => completion.lesson_id === lessonId);
  };

  const getLessonScore = (lessonId: string) => {
    const completion = completions.find(completion => completion.lesson_id === lessonId);
    return completion?.score || 0;
  };

  const isLessonUnlocked = (lessonIndex: number) => {
    if (lessonIndex === 0) return true;
    return isLessonCompleted(lessons[lessonIndex - 1].id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lessons...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <BookOpen className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading lessons</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button 
          onClick={fetchLessons}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No lessons found</h3>
        <p className="mt-1 text-sm text-gray-500">Create a roadmap to get started with lessons.</p>
      </div>
    );
  }

  // Group lessons by week
  const lessonsByWeek = lessons.reduce((acc, lesson) => {
    const week = lesson.week_number;
    if (!acc[week]) acc[week] = [];
    acc[week].push(lesson);
    return acc;
  }, {} as Record<number, Lesson[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your Lessons</h1>
            <p className="text-blue-100 mt-1">Continue your learning journey</p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span>Completed: {completions.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span>Total: {lessons.length}</span>
          </div>
        </div>
      </div>

      {/* Lessons by Week */}
      {Object.entries(lessonsByWeek).map(([week, weekLessons]) => (
        <div key={week} className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Week {week}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {weekLessons.filter(lesson => isLessonCompleted(lesson.id)).length} of {weekLessons.length} lessons completed
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weekLessons.map((lesson, index) => {
                const globalIndex = lessons.findIndex(l => l.id === lesson.id);
                const isCompleted = isLessonCompleted(lesson.id);
                const isUnlocked = isLessonUnlocked(globalIndex);
                const score = getLessonScore(lesson.id);

                return (
                  <div
                    key={lesson.id}
                    className={`border rounded-lg p-4 transition-all duration-200 ${
                      isUnlocked
                        ? 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className={`font-medium ${
                          isUnlocked ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {lesson.title}
                        </h3>
                        <p className={`text-sm mt-1 ${
                          isUnlocked ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {lesson.lesson_objective}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isCompleted && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm font-medium text-green-600">{score}%</span>
                          </div>
                        )}
                        {!isUnlocked && <Lock className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{lesson.estimated_time}</span>
                      </div>

                      {isUnlocked ? (
                        <Link
                          to={`/lessons/${lesson.id}`}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {isCompleted ? (
                            <>
                              <BookOpen className="w-4 h-4" />
                              <span>Review</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              <span>Start</span>
                            </>
                          )}
                        </Link>
                      ) : (
                        <div className="flex items-center space-x-1 px-3 py-1.5 bg-gray-200 text-gray-500 text-sm rounded-lg">
                          <Lock className="w-4 h-4" />
                          <span>Locked</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LessonsList;