'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Eye, EyeOff, ExternalLink, CheckCircle } from 'lucide-react';
import { authAPI } from '@/utils/api';

interface GitLabSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const GitLabSettings: React.FC<GitLabSettingsProps> = ({ isOpen, onClose, onSuccess }) => {
  const [apiToken, setApiToken] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://gitlab.com');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.updatePreferences({
        gitlabSettings: {
          apiToken,
          baseUrl,
        },
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save GitLab settings');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!apiToken) {
      setError('Please enter your GitLab API token first');
      return;
    }

    setTestStatus('testing');
    setError('');

    try {
      // Test the GitLab API connection
      const response = await fetch(`${baseUrl}/api/v4/user`, {
        headers: {
          'Private-Token': apiToken,
        },
      });

      if (response.ok) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        setTestStatus('failed');
        setError('Failed to connect to GitLab. Please check your token and URL.');
      }
    } catch (error) {
      setTestStatus('failed');
      setError('Failed to connect to GitLab. Please check your token and URL.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-cyber-blue" />
            <h2 className="text-xl font-bold">GitLab Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-300 mb-2">Setup Instructions</h4>
          <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
            <li>Go to GitLab → User Settings → Access Tokens</li>
            <li>Create a token with "api" scope</li>
            <li>Copy the token and paste it below</li>
          </ol>
          <a
            href={`${baseUrl}/-/profile/personal_access_tokens`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-cyber-blue hover:text-blue-400 text-sm mt-2"
          >
            Create GitLab Token <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              GitLab URL
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
              placeholder="https://gitlab.com"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Use https://gitlab.com for GitLab.com or your self-hosted URL
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Personal Access Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="w-full px-3 py-2 pr-20 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white font-mono text-sm"
                placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                required
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={testConnection}
                disabled={testStatus === 'testing'}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cyber-blue hover:text-blue-400 disabled:opacity-50"
              >
                {testStatus === 'testing' ? (
                  <div className="w-4 h-4 border-2 border-cyber-blue border-t-transparent rounded-full animate-spin" />
                ) : testStatus === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-cyber-green" />
                ) : (
                  '🔗'
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Token needs "api" scope to access repositories and create webhooks
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/50 rounded-lg p-3"
            >
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          {testStatus === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/10 border border-green-500/50 rounded-lg p-3"
            >
              <p className="text-green-400 text-sm">✅ Successfully connected to GitLab!</p>
            </motion.div>
          )}

          <div className="flex space-x-3 pt-4">
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 bg-cyber-blue hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </div>
              ) : (
                'Save Settings'
              )}
            </motion.button>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default GitLabSettings;
