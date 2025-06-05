'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, LogOut, Settings } from 'lucide-react';
import { authAPI, User } from '@/utils/api';
import Cookies from 'js-cookie';
import AuthModal from './AuthModal';
import GitLabSettings from './GitLabSettings';

interface UserProviderProps {
  children: React.ReactNode;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  showAuthModal: () => void;
  logout: () => void;
  refreshUser: () => void;
}

const UserContext = React.createContext<UserContextType>({
  user: null,
  loading: true,
  showAuthModal: () => {},
  logout: () => {},
  refreshUser: () => {},
});

export const useUser = () => React.useContext(UserContext);

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = Cookies.get('auth_token');

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      Cookies.remove('auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const showAuthModal = () => {
    setAuthModalOpen(true);
  };

  const logout = () => {
    Cookies.remove('auth_token');
    setUser(null);
  };

  const refreshUser = () => {
    checkAuth();
  };

  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
    checkAuth(); // Refresh user data
  };

  return (
    <UserContext.Provider value={{ user, loading, showAuthModal, logout, refreshUser }}>
      {children}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </UserContext.Provider>
  );
};

// User profile dropdown component
interface UserProfileProps {
  onGitLabConfigured?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onGitLabConfigured }) => {
  const { user, logout, refreshUser } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [gitlabSettingsOpen, setGitlabSettingsOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <motion.button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-800 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {user.avatar ? (
          <img 
            src={user.avatar} 
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 bg-cyber-blue rounded-full flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-white" />
          </div>
        )}
        <span className="text-sm font-medium hidden md:block">{user.name}</span>
      </motion.button>

      {dropdownOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute right-0 mt-2 w-48 bg-dark-card border border-dark-border rounded-lg shadow-lg z-50"
        >
          <div className="p-3 border-b border-gray-700">
            <p className="font-medium text-white">{user.name}</p>
            <p className="text-sm text-gray-400">{user.email}</p>
            <p className="text-xs text-cyber-blue">{user.role}</p>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setGitlabSettingsOpen(true);
                setDropdownOpen(false);
              }}
              data-gitlab-settings
              className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              <Settings className="w-4 h-4 mr-2" />
              GitLab Settings
            </button>
            <button className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800">
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </button>
            <button
              onClick={logout}
              className="flex items-center w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-800"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </motion.div>
      )}

      <GitLabSettings
        isOpen={gitlabSettingsOpen}
        onClose={() => setGitlabSettingsOpen(false)}
        onSuccess={() => {
          refreshUser(); // Refresh user data to get updated GitLab settings
          if (onGitLabConfigured) {
            onGitLabConfigured();
          }
        }}
        existingSettings={user?.gitlabSettings}
      />
    </div>
  );
};
