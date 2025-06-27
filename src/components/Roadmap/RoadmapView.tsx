import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Roadmap, Lesson, LessonCompletion } from '../../lib/supabase';
import { 
  Map, 
  Calendar, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  Play, 
  Target,
  TrendingUp 
} from 'lucide-react';

const RoadmapView: React.FC = () => {
  const { user } = useAuth();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completions, setCompletions] = useState<LessonCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRoadmapData();
    }
  }, [user]);

  const fetchRoadmapData = async () => {
    try {
      // Fetch roadmap - get the most recent one instead of using .single()
      const { data: roadmapData, error: roadmapError } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (roadmapError) throw roadmapError;
      
      // Check if we have any roadmaps
      if (!roadmapData || roadmapData.length === 0) {
        setRoadmap(null);
        setLoading(false);
        return;
      }

      const currentRoadmap = roadmapData[0];
      setRoadmap(currentRoadmap);

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('roadmap_id', currentRoadmap.id)
        .order('week_number', { ascending: true })
        .order('order_index', { ascending: true });

      if (lessonsError) throw lessonsError;
      setLessons(lessonsData);

      // Fetch completions
      const { data: completionsData, error: completionsError } = await supabase
        .from('lesson_completions')
        .select('*')
        .eq('user_id', user!.id);

      if (completionsError) throw completionsError;
      setCompletions(completionsData || []);

    } catch (error) {
      console.error('Error fetching roadmap data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isLessonCompleted = (lessonId: string) => {
    return completions.some(completion => completion.lesson_id === lessonId);
  };

  const getWeekProgress = (week: any) => {
    const weekLessons = lessons.filter(lesson => lesson.week_number === week.weekNumber);
    const completedLessons = weekLessons.filter(lesson => isLessonCompleted(lesson.id));
    return weekLessons.length > 0 ? Math.round((completedLessons.length / weekLessons.length) * 100) : 0;
  };

  const getOverallProgress = () => {
    if (lessons.length === 0) return 0;
    const completedCount = lessons.filter(lesson => isLessonCompleted(lesson.id)).length;
    return Math.round((completedCount / lessons.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="text-center py-12">
        <Map className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No roadmap found</h3>
        <p className="mt-1 text-sm text-gray-500">Create a roadmap to get started.</p>
      </div>
    );
  }

  const overallProgress = getOverallProgress();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Learning Roadmap</h1>
            <p className="text-blue-100 mt-1">{roadmap.title}</p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Map className="w-8 h-8" />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-4 h-4" />
            <span className="text-sm font-medium">Goal:</span>
          </div>
          <p className="text-blue-100">{roadmap.goal}</p>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Overall Progress</h2>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-lg font-bold text-green-600">{overallProgress}%</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {completions.length} of {lessons.length} lessons completed
        </div>
      </div>

      {/* Roadmap Timeline */}
      <div className="space-y-6">
        {roadmap.weeks.map((week: any, weekIndex: number) => {
          const weekNumber = weekIndex + 1;
          const weekLessons = lessons.filter(lesson => lesson.week_number === weekNumber);
          const weekProgress = getWeekProgress({ ...week, weekNumber });
          const isCurrentWeek = weekIndex === 0 || weekProgress > 0;

          return (
            <div key={weekIndex} className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      weekProgress === 100 ? 'bg-green-100' : 
                      weekProgress > 0 ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {weekProgress === 100 ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Calendar className={`w-5 h-5 ${
                          weekProgress > 0 ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Week {weekNumber}: {week.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {weekLessons.length} lessons • {weekProgress}% complete
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{weekProgress}%</div>
                      <div className="text-xs text-gray-500">Complete</div>
                    </div>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      weekProgress === 100 ? 'bg-green-500' : 
                      weekProgress > 0 ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                    style={{ width: `${weekProgress}%` }}
                  />
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {week.topics.map((topic: any, topicIndex: number) => {
                    const lesson = weekLessons.find(l => l.order_index === topicIndex);
                    const isCompleted = lesson ? isLessonCompleted(lesson.id) : false;

                    return (
                      <div
                        key={topicIndex}
                        className={`border rounded-lg p-4 transition-all duration-200 ${
                          lesson ? 'border-gray-200 hover:border-blue-300 hover:shadow-md' : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{topic.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{topic.lessonObjective}</p>
                          </div>
                          {isCompleted && (
                            <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>{topic.estimatedTime}</span>
                          </div>

                          {lesson ? (
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
                            <div className="px-3 py-1.5 bg-gray-200 text-gray-500 text-sm rounded-lg">
                              Coming Soon
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoadmapView;