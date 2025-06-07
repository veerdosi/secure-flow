'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, LogOut, GitBranch, ChevronDown, Shield } from 'lucide-react';
import { authAPI, clearAuth } from '@/utils/api';
import GitLabSettings from './GitLabSettings';
import Cookies from 'js-cookie';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  projects: string[];
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    autoRefresh: boolean;
    dashboardLayout: 'compact' | 'detailed';
    defaultTimeRange: '1h' | '24h' | '7d' | '30d';
  };
  gitlabSettings?: {
    apiToken: string;
    baseUrl: string;
  };
  lastLogin?: string;
  createdAt: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updatePreferences: (preferences: Partial<User['preferences']>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = Cookies.get('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const userData = await authAPI.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const updatePreferences = async (preferences: Partial<User['preferences']>) => {
    try {
      await authAPI.updatePreferences(preferences);
      if (user) {
        setUser({
          ...user,
          preferences: { ...user.preferences, ...preferences }
        });
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  };

  const value: UserContextType = {
    user,
    loading,
    refreshUser,
    updatePreferences,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// User Profile Dropdown Component
interface UserProfileProps {
  onGitLabConfigured?: () => void;
  showGitLabSettings?: boolean;
  setShowGitLabSettings?: (show: boolean) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  onGitLabConfigured,
  showGitLabSettings: externalShowGitLabSettings,
  setShowGitLabSettings: externalSetShowGitLabSettings
}) => {
  const { user, refreshUser } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [internalShowGitLabSettings, setInternalShowGitLabSettings] = useState(false);

  // Use external state if provided, otherwise use internal state
  const showGitLabSettings = externalShowGitLabSettings !== undefined ? externalShowGitLabSettings : internalShowGitLabSettings;
  const setShowGitLabSettings = externalSetShowGitLabSettings || setInternalShowGitLabSettings;

  if (!user) return null;

  const handleSignOut = () => {
    clearAuth();
  };

  const handleGitLabSuccess = () => {
    refreshUser();
    onGitLabConfigured?.();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="relative">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-dark-card transition-colors"
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-cyber-blue rounded-full flex items-center justify-center text-sm font-bold text-white">
              {getInitials(user.name)}
            </div>
          )}
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-gray-400">{user.role.replace('_', ' ')}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </motion.button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />

              {/* Menu */}
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-72 bg-dark-card border border-dark-border rounded-xl shadow-2xl z-50 overflow-hidden"
              >
                {/* User Info */}
                <div className="p-4 border-b border-dark-border">
                  <div className="flex items-center space-x-3">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-cyber-blue rounded-full flex items-center justify-center text-lg font-bold text-white">
                        {getInitials(user.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      <div className="flex items-center mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                          {user.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GitLab Status */}
                <div className="p-4 border-b border-dark-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <GitBranch className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">GitLab Integration</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        user.gitlabSettings?.apiToken ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                      <span className={`text-xs ${
                        user.gitlabSettings?.apiToken ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {user.gitlabSettings?.apiToken ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>

                  {!user.gitlabSettings?.apiToken && (
                    <p className="text-xs text-gray-400 mt-2">
                      Configure GitLab to enable project scanning
                    </p>
                  )}
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  <motion.button
                    onClick={() => {
                      setShowGitLabSettings(true);
                      setIsOpen(false);
                    }}
                    whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.7)' }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-gray-300 hover:text-white rounded-lg transition-colors"
                    data-gitlab-settings
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>GitLab Settings</span>
                  </motion.button>

                  <motion.button
                    onClick={() => {
                      // TODO: Implement preferences modal
                      setIsOpen(false);
                    }}
                    whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.7)' }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-gray-300 hover:text-white rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Preferences</span>
                  </motion.button>

                  <div className="border-t border-dark-border my-2" />

                  <motion.button
                    onClick={() => {
                      handleSignOut();
                      setIsOpen(false);
                    }}
                    whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-red-400 hover:text-red-300 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </motion.button>
                </div>

                {/* Footer */}
                <div className="p-3 bg-gray-800/50 border-t border-dark-border">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Last login:</span>
                    <span>
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : 'Never'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                    <span>Projects:</span>
                    <span>{user.projects.length}</span>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
