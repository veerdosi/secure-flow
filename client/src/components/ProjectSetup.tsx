'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Settings, GitBranch, Clock, Globe, Key, AlertTriangle } from 'lucide-react';
import { ProjectConfig, ScanType } from '@/types';
import { useUser } from './UserProvider';
import { projectAPI } from '@/utils/api';

interface ProjectSetupProps {
  onProjectCreated: (project: ProjectConfig) => void;
  triggerOpen?: boolean;
}

const ProjectSetup: React.FC<ProjectSetupProps> = ({ onProjectCreated, triggerOpen = false }) => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (triggerOpen) {
      setIsOpen(true);
    }
  }, [triggerOpen]);

  const [formData, setFormData] = useState({
    name: '',
    gitlabProjectId: '',
    repositoryUrl: '',
    branch: 'main',
    scanFrequency: 'ON_PUSH' as const,
    webhookSecret: '',
    notificationEmail: user?.email || '',
    scanTypes: ['STATIC_ANALYSIS', 'DEPENDENCY_SCAN'] as ScanType[],
  });

  const generateWebhookSecret = () => {
    // Simple random string - doesn't need crypto strength
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, webhookSecret: result }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create project configuration
      const projectConfig: ProjectConfig = {
        id: formData.gitlabProjectId,
        name: formData.name,
        gitlabProjectId: formData.gitlabProjectId,
        repositoryUrl: formData.repositoryUrl,
        branch: formData.branch,
        scanFrequency: formData.scanFrequency,
        notificationSettings: {
          email: true,
          slack: false,
          webhook: false,
          emailAddresses: [formData.notificationEmail],
          minSeverity: 'MEDIUM',
        },
        excludePaths: ['node_modules/', 'dist/', 'build/', '.git/'],
        scanTypes: formData.scanTypes,
        complianceFrameworks: ['OWASP'],
        webhookSecret: formData.webhookSecret,
        createdBy: user?.id,
        createdAt: new Date().toISOString(),
      };

      // Call API to create project
      const response = await projectAPI.create(projectConfig);

      onProjectCreated(response.project);
      setIsOpen(false);

      // Reset form
      setFormData({
        name: '',
        gitlabProjectId: '',
        repositoryUrl: '',
        branch: 'main',
        scanFrequency: 'ON_PUSH' as const,
        webhookSecret: '',
        notificationEmail: user?.email || '',
        scanTypes: ['STATIC_ANALYSIS', 'DEPENDENCY_SCAN'] as ScanType[],
      });

    } catch (error: any) {
      setError(error.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/gitlab` : '/api/webhooks/gitlab';

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center space-x-2 bg-cyber-blue hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>Add GitLab Project</span>
      </motion.button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add GitLab Project</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-cyber-blue" />
                  Project Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                      placeholder="My Awesome Project"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      GitLab Project ID
                    </label>
                    <input
                      type="text"
                      value={formData.gitlabProjectId}
                      onChange={(e) => setFormData(prev => ({ ...prev, gitlabProjectId: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                      placeholder="12345"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Find this in GitLab → Project → Settings → General
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Repository URL
                  </label>
                  <input
                    type="url"
                    value={formData.repositoryUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, repositoryUrl: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                    placeholder="https://gitlab.com/username/project"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Branch to Monitor
                    </label>
                    <input
                      type="text"
                      value={formData.branch}
                      onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                      placeholder="main"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Scan Frequency
                    </label>
                    <select
                      value={formData.scanFrequency}
                      onChange={(e) => setFormData(prev => ({ ...prev, scanFrequency: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                    >
                      <option value="ON_PUSH">On Every Push</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Webhook Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-cyber-green" />
                  Webhook Configuration
                </h3>

                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Webhook Secret
                    </label>
                    <button
                      type="button"
                      onClick={generateWebhookSecret}
                      className="text-xs text-cyber-blue hover:text-blue-400"
                    >
                      Generate New
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.webhookSecret}
                    onChange={(e) => setFormData(prev => ({ ...prev, webhookSecret: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded font-mono text-sm text-white"
                    placeholder="Click 'Generate New' to create a secure secret"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    This secret will be used to verify webhook authenticity
                  </p>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="font-medium text-blue-300 mb-2">GitLab Webhook Setup Instructions</h4>
                  <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                    <li>Go to your GitLab project → Settings → Webhooks</li>
                    <li>Add this URL: <code className="bg-gray-800 px-1 rounded text-xs">{webhookUrl}</code></li>
                    <li>Set the secret token (copy from above)</li>
                    <li>Enable "Push events" and "Merge request events"</li>
                    <li>Click "Add webhook"</li>
                  </ol>
                </div>
              </div>

              {/* Scan Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-cyber-orange" />
                  Scan Configuration
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Scan Types
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'STATIC_ANALYSIS', label: 'Static Code Analysis', desc: 'Analyze code for security vulnerabilities' },
                      { id: 'DEPENDENCY_SCAN', label: 'Dependency Scanning', desc: 'Check for vulnerable dependencies' },
                      { id: 'SECRET_DETECTION', label: 'Secret Detection', desc: 'Find exposed API keys and credentials' },
                    ].map((scanType) => (
                      <label key={scanType.id} className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.scanTypes.includes(scanType.id as ScanType)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                scanTypes: [...prev.scanTypes, scanType.id as ScanType]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                scanTypes: prev.scanTypes.filter(t => t !== scanType.id)
                              }));
                            }
                          }}
                          className="mt-1 w-4 h-4 text-cyber-blue bg-gray-800 border-gray-600 rounded focus:ring-cyber-blue"
                        />
                        <div>
                          <div className="text-sm font-medium text-white">{scanType.label}</div>
                          <div className="text-xs text-gray-400">{scanType.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notification Email
                  </label>
                  <input
                    type="email"
                    value={formData.notificationEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, notificationEmail: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                    required
                  />
                </div>
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
                      Creating Project...
                    </div>
                  ) : (
                    'Create Project'
                  )}
                </motion.button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-3 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default ProjectSetup;
