import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Profile, UserProgress } from '../../lib/supabase';
import { 
  Shield, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Trash2, 
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface UserWithProgress {
  profile: Profile;
  progress: UserProgress[];
}

const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile?.is_admin) {
      fetchUsers();
    }
  }, [profile]);

  const fetchUsers = async () => {
    try {
      // Fetch all users (except admins)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_admin', false)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch progress for each user
      const usersWithProgress: UserWithProgress[] = [];
      
      for (const profile of profiles) {
        const { data: progress, error: progressError } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', profile.id);

        if (progressError) {
          console.error('Error fetching progress for user:', profile.id, progressError);
          continue;
        }

        usersWithProgress.push({
          profile,
          progress: progress || []
        });
      }

      setUsers(usersWithProgress);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Delete user's auth record (this will cascade delete all related data)
      const { error } = await supabase.auth.admin.deleteUser(userToDelete.id);
      
      if (error) throw error;

      setMessage('User deleted successfully');
      setUsers(users.filter(user => user.profile.id !== userToDelete.id));
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage('Failed to delete user');
    }
  };

  const getTotalStats = () => {
    const totalUsers = users.length;
    const totalLessons = users.reduce((sum, user) => 
      sum + user.progress.reduce((progSum, prog) => progSum + prog.completed_lessons, 0), 0
    );
    const totalTime = users.reduce((sum, user) => 
      sum + user.progress.reduce((progSum, prog) => progSum + prog.total_time_spent, 0), 0
    );
    const avgAccuracy = users.length > 0 ? users.reduce((sum, user) => 
      sum + user.progress.reduce((progSum, prog) => progSum + prog.average_accuracy, 0) / Math.max(user.progress.length, 1), 0
    ) / users.length : 0;

    return { totalUsers, totalLessons, totalTime, avgAccuracy };
  };

  if (!profile?.is_admin) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">You don't have admin privileges.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-red-100 mt-1">Manage users and monitor progress</p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          message.includes('successfully') 
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.includes('successfully') ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm">{message}</span>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Lessons Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalLessons}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Study Time</p>
              <p className="text-2xl font-bold text-gray-900">{Math.floor(stats.totalTime / 60)}h</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Accuracy</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(stats.avgAccuracy)}%</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Users & Progress</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Goal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Accuracy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const totalProgress = user.progress.reduce((sum, prog) =>
                  sum + (prog.completed_lessons / Math.max(prog.total_lessons, 1)) * 100, 0
                ) / Math.max(user.progress.length, 1);
                
                const totalTime = user.progress.reduce((sum, prog) => sum + prog.total_time_spent, 0);
                const avgAccuracy = user.progress.reduce((sum, prog) => sum + prog.average_accuracy, 0) / Math.max(user.progress.length, 1);

                return (
                  <tr key={user.profile.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                          {user.profile.avatar_url ? (
                            <img 
                              src={user.profile.avatar_url} 
                              alt="Avatar" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.profile.full_name || 'Unnamed User'}
                          </div>
                          <div className="text-sm text-gray-500">{user.profile.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {user.profile.goal || 'No goal set'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(totalProgress, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900">{Math.round(totalProgress)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.floor(totalTime / 60)}h {totalTime % 60}m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.round(avgAccuracy)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-900 p-1 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setUserToDelete(user.profile);
                            setDeleteModalOpen(true);
                          }}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Delete User</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <strong>{userToDelete?.full_name || userToDelete?.email}</strong>? 
              This action cannot be undone and will remove all their data.
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete User
              </button>
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;