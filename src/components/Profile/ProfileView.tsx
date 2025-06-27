import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Camera, Save, AlertCircle, CheckCircle } from 'lucide-react';

const ProfileView: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Predefined avatar options
  const avatarOptions = [
    'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/1300402/pexels-photo-1300402.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/1542085/pexels-photo-1542085.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2'
  ];

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      await updateProfile({
        full_name: fullName,
        avatar_url: selectedAvatar
      });
      setMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      setMessage('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFullName(profile?.full_name || '');
    setSelectedAvatar(profile?.avatar_url || '');
    setIsEditing(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Profile Settings</h1>
            <p className="text-blue-100 mt-1">Manage your account information</p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
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

          {/* Avatar Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                {selectedAvatar ? (
                  <img 
                    src={selectedAvatar} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
              </div>
              {isEditing && (
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-3">Choose from predefined avatars:</p>
                  <div className="grid grid-cols-4 gap-3">
                    {avatarOptions.map((avatar, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${
                          selectedAvatar === avatar 
                            ? 'border-blue-500 ring-2 ring-blue-200' 
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <img 
                          src={avatar} 
                          alt={`Avatar ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!isEditing}
                className={`pl-10 w-full px-4 py-3 border rounded-lg transition-colors ${
                  isEditing 
                    ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                    : 'border-gray-200 bg-gray-50'
                }`}
                placeholder="Enter your full name"
              />
            </div>
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                value={profile?.email || ''}
                disabled
                className="pl-10 w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg text-gray-500"
              />
            </div>
            <p className="text-xs text-gray-500">Email address cannot be changed</p>
          </div>

          {/* Goal (Read-only) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Learning Goal
            </label>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700">{profile?.goal || 'No goal set'}</p>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex items-center space-x-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Changes</span>
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Statistics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Account Statistics</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">-</div>
              <div className="text-sm text-gray-600">Lessons Completed</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">-</div>
              <div className="text-sm text-gray-600">Hours Studied</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">-</div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;