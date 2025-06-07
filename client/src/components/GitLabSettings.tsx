'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  ExternalLink,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  GitBranch,
  Shield,
  X
} from 'lucide-react';
import { authAPI } from '@/utils/api';

interface GitLabSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentSettings?: {
    apiToken?: string;
    baseUrl?: string;
  };
}

const GitLabSettings: React.FC<GitLabSettingsProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentSettings
}) => {
  const [formData, setFormData] = useState({
    apiToken: '',
    baseUrl: 'https://gitlab.com'
  });
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen && currentSettings) {
      setFormData({
        apiToken: '',
        baseUrl: currentSettings.baseUrl || 'https://gitlab.com'
      });
    }
  }, [isOpen, currentSettings]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
    setTestResult(null);
  };

  const testConnection = async () => {
    if (!formData.apiToken.trim()) {
      setError('Please enter an API token first');
      return;
    }

    setTesting(true);
    setError('');
    setTestResult(null);

    try {
      const response = await authAPI.testGitLabConnection({
        apiToken: formData.apiToken,
        baseUrl: formData.baseUrl
      });

      if (response.success) {
        setTestResult(response.user);
        setSuccess('✅ Connection successful!');
      } else {
        setError(response.error || 'Connection test failed');
      }
    } catch (error: any) {
      console.error('GitLab test failed:', error);
      setError(error.response?.data?.error || 'Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.apiToken.trim()) {
      setError('API token is required');
      return;
    }

    if (!formData.baseUrl.trim()) {
      setError('GitLab URL is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.updateGitLabSettings(formData);
      setSuccess('GitLab settings saved successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Failed to save GitLab settings:', error);
      setError(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      apiToken: '',
      baseUrl: 'https://gitlab.com'
    });
    setError('');
    setSuccess('');
    setTestResult(null);
    setShowToken(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-dark-card border border-dark-border rounded-xl w-full max-w-2xl my-8 shadow-2xl"
          >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-dark-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">GitLab Settings</h2>
                <p className="text-gray-400 text-sm">Configure your GitLab API access</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">

            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
              <h3 className="flex items-center font-semibold mb-3">
                <Shield className="w-5 h-5 mr-2 text-blue-400" />
                Setup Instructions
              </h3>
              <ol className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                  Go to GitLab → User Settings → Access Tokens
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                  Create a new token with <strong>api</strong> scope
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                  Copy and paste the token below
                </li>
              </ol>

              <motion.a
                href="https://gitlab.com/-/profile/personal_access_tokens"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                className="inline-flex items-center mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Create GitLab Token
              </motion.a>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* GitLab URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  GitLab URL
                </label>
                <input
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                  placeholder="https://gitlab.com"
                />
                <p className="text-xs text-gray-400 mt-1">
                  For self-hosted GitLab, enter your instance URL
                </p>
              </div>

              {/* API Token */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Personal Access Token *
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={formData.apiToken}
                    onChange={(e) => handleInputChange('apiToken', e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white font-mono"
                    placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Token must have <strong>api</strong> scope to access repositories
                </p>
              </div>

              {/* Test Connection */}
              <div className="flex items-center space-x-3">
                <motion.button
                  onClick={testConnection}
                  disabled={testing || !formData.apiToken.trim()}
                  whileHover={{ scale: testing ? 1 : 1.05 }}
                  whileTap={{ scale: testing ? 1 : 0.95 }}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <GitBranch className="w-4 h-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </motion.button>

                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center text-sm text-gray-300"
                  >
                    <Check className="w-4 h-4 text-green-400 mr-2" />
                    Connected as <strong className="ml-1">{testResult.username}</strong>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Connection Result */}
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/10 border border-green-500/50 rounded-lg p-4"
              >
                <div className="flex items-center mb-2">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  <h4 className="font-semibold text-green-400">Connection Successful!</h4>
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  <p><strong>Username:</strong> {testResult.username}</p>
                  <p><strong>Name:</strong> {testResult.name}</p>
                  <p><strong>Email:</strong> {testResult.email}</p>
                </div>
              </motion.div>
            )}

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/50 rounded-lg p-4"
              >
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                  <p className="text-red-400">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Success Display */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/10 border border-green-500/50 rounded-lg p-4"
              >
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  <p className="text-green-400">{success}</p>
                </div>
              </motion.div>
            )}

            {/* Security Notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" />
                <div className="text-sm">
                  <p className="text-yellow-400 font-semibold mb-1">Security Notice</p>
                  <p className="text-gray-300">
                    Your API token is encrypted and stored securely. It's only used to access your GitLab projects
                    for security scanning purposes. You can revoke access at any time from your GitLab settings.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t border-dark-border">
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-gray-400 hover:text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Cancel
            </motion.button>

            <motion.button
              onClick={handleSave}
              disabled={loading || !formData.apiToken.trim()}
              whileHover={{ scale: loading ? 1 : 1.05 }}
              whileTap={{ scale: loading ? 1 : 0.95 }}
              className="bg-cyber-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default GitLabSettings;
