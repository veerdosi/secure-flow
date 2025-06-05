'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  GitBranch,
  Settings,
  Copy,
  ExternalLink,
  Check,
  AlertCircle,
  Webhook,
  Shield,
  Mail,
  Clock,
  RefreshCw,
  X
} from 'lucide-react';
import { projectAPI } from '@/utils/api';
import { useUser } from './UserProvider';

interface ProjectSetupProps {
  onProjectCreated: (project: any) => void;
  triggerOpen?: boolean;
  onClose?: () => void;
  buttonText?: string;
  buttonIcon?: React.ReactNode;
}

const ProjectSetup: React.FC<ProjectSetupProps> = ({
  onProjectCreated,
  triggerOpen = false,
  onClose,
  buttonText = "Add GitLab Project",
  buttonIcon = <Plus className="w-5 h-5 mr-2" />
}) => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    gitlabProjectId: '',
    repositoryUrl: '',
    branch: 'main',
    scanFrequency: 'ON_PUSH',
    notificationEmail: user?.email || '',
    scanTypes: ['STATIC_ANALYSIS', 'DEPENDENCY_SCAN', 'SECRET_SCAN']
  });

  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    if (triggerOpen) {
      setIsOpen(true);
    }
  }, [triggerOpen]);

  useEffect(() => {
    if (isOpen) {
      generateWebhookSecret();
      setWebhookUrl(`${window.location.origin}/api/webhooks/gitlab`);
      setFormData(prev => ({ ...prev, notificationEmail: user?.email || '' }));
    }
  }, [isOpen, user]);

  const generateWebhookSecret = () => {
    const secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setWebhookSecret(secret);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleScanTypeToggle = (scanType: string) => {
    setFormData(prev => ({
      ...prev,
      scanTypes: prev.scanTypes.includes(scanType)
        ? prev.scanTypes.filter(type => type !== scanType)
        : [...prev.scanTypes, scanType]
    }));
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) return 'Project name is required';
        if (!formData.gitlabProjectId.trim()) return 'GitLab Project ID is required';
        if (!formData.repositoryUrl.trim()) return 'Repository URL is required';
        break;
      case 2:
        // Webhook step - no validation needed as it's informational
        break;
      case 3:
        if (formData.scanTypes.length === 0) return 'At least one scan type must be selected';
        if (!formData.notificationEmail.trim()) return 'Notification email is required';
        break;
    }
    return null;
  };

  const nextStep = () => {
    const validation = validateStep(currentStep);
    if (validation) {
      setError(validation);
      return;
    }
    setError('');
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError('');
  };

  const handleSubmit = async () => {
    const validation = validateStep(3);
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const projectData = {
        ...formData,
        scanFrequency: formData.scanFrequency as 'ON_PUSH' | 'DAILY' | 'WEEKLY',
        webhookSecret,
        notificationSettings: {
          email: true,
          emailAddresses: [formData.notificationEmail],
          slack: false,
          webhook: false,
          minSeverity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
        }
      };

      const newProject = await projectAPI.create(projectData);
      onProjectCreated(newProject);
      handleClose();
    } catch (error: any) {
      console.error('Failed to create project:', error);
      setError(error.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCurrentStep(1);
    setError('');
    setFormData({
      name: '',
      gitlabProjectId: '',
      repositoryUrl: '',
      branch: 'main',
      scanFrequency: 'ON_PUSH',
      notificationEmail: user?.email || '',
      scanTypes: ['STATIC_ANALYSIS', 'DEPENDENCY_SCAN', 'SECRET_SCAN']
    });
    onClose?.();
  };

  const scanTypeOptions = [
    {
      id: 'STATIC_ANALYSIS',
      name: 'Static Analysis',
      description: 'Code quality and security analysis',
      icon: <Shield className="w-5 h-5" />
    },
    {
      id: 'DEPENDENCY_SCAN',
      name: 'Dependency Scan',
      description: 'Check for vulnerable dependencies',
      icon: <GitBranch className="w-5 h-5" />
    },
    {
      id: 'SECRET_SCAN',
      name: 'Secret Detection',
      description: 'Find exposed API keys and secrets',
      icon: <AlertCircle className="w-5 h-5" />
    }
  ];

  if (!isOpen) {
    return (
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="bg-cyber-blue hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center"
      >
        {buttonIcon}
        {buttonText}
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-dark-card border border-dark-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-dark-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-cyber-blue rounded-full flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Add GitLab Project</h2>
                <p className="text-gray-400 text-sm">Step {currentStep} of 3</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-4 border-b border-dark-border">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`flex items-center ${step < 3 ? 'flex-1' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step <= currentStep
                        ? 'bg-cyber-blue text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {step < currentStep ? <Check className="w-4 h-4" /> : step}
                  </div>
                  {step < 3 && (
                    <div
                      className={`flex-1 h-1 mx-4 rounded ${
                        step < currentStep ? 'bg-cyber-blue' : 'bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Project Details</span>
              <span>Webhook Setup</span>
              <span>Configuration</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Step 1: Project Details */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-4">Project Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Project Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                        placeholder="My Awesome Project"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        GitLab Project ID *
                      </label>
                      <input
                        type="text"
                        value={formData.gitlabProjectId}
                        onChange={(e) => handleInputChange('gitlabProjectId', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                        placeholder="12345"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Find this in GitLab → Project → Settings → General
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Repository URL *
                      </label>
                      <input
                        type="url"
                        value={formData.repositoryUrl}
                        onChange={(e) => handleInputChange('repositoryUrl', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                        placeholder="https://gitlab.com/username/project"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Default Branch
                      </label>
                      <input
                        type="text"
                        value={formData.branch}
                        onChange={(e) => handleInputChange('branch', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                        placeholder="main"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Scan Frequency
                    </label>
                    <select
                      value={formData.scanFrequency}
                      onChange={(e) => handleInputChange('scanFrequency', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                    >
                      <option value="ON_PUSH">On Every Push</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Webhook Setup */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Webhook className="w-5 h-5 mr-2 text-cyber-blue" />
                    Webhook Configuration
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Configure a webhook in your GitLab project to enable real-time security scanning when you push code.
                  </p>

                  <div className="bg-gray-800/50 rounded-lg p-6 space-y-6">
                    {/* Webhook URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Webhook URL
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={webhookUrl}
                          readOnly
                          className="flex-1 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white font-mono text-sm"
                        />
                        <motion.button
                          onClick={() => copyToClipboard(webhookUrl, 'url')}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center"
                        >
                          {copied === 'url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </motion.button>
                      </div>
                    </div>

                    {/* Webhook Secret */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-300">
                          Webhook Secret
                        </label>
                        <motion.button
                          onClick={generateWebhookSecret}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="text-cyber-blue hover:text-blue-400 text-sm flex items-center"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Generate New
                        </motion.button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={webhookSecret}
                          readOnly
                          className="flex-1 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white font-mono text-sm"
                        />
                        <motion.button
                          onClick={() => copyToClipboard(webhookSecret, 'secret')}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center"
                        >
                          {copied === 'secret' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </motion.button>
                      </div>
                    </div>

                    {/* Setup Instructions */}
                    <div className="bg-dark-card border border-dark-border rounded-lg p-4">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <ExternalLink className="w-4 h-4 mr-2 text-cyber-blue" />
                        GitLab Webhook Setup Instructions
                      </h4>
                      <ol className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start">
                          <span className="bg-cyber-blue text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                          Go to your GitLab project → Settings → Webhooks
                        </li>
                        <li className="flex items-start">
                          <span className="bg-cyber-blue text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                          Paste the webhook URL above
                        </li>
                        <li className="flex items-start">
                          <span className="bg-cyber-blue text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                          Enter the secret token above
                        </li>
                        <li className="flex items-start">
                          <span className="bg-cyber-blue text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                          Check "Push events" and "Merge request events"
                        </li>
                        <li className="flex items-start">
                          <span className="bg-cyber-blue text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">5</span>
                          Click "Add webhook"
                        </li>
                      </ol>

                      <motion.a
                        href={formData.repositoryUrl ? `${formData.repositoryUrl}/-/hooks` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.02 }}
                        className="inline-flex items-center mt-4 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white px-4 py-2 rounded-lg text-sm transition-all"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open GitLab Webhooks
                      </motion.a>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Scan Configuration */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-cyber-blue" />
                    Scan Configuration
                  </h3>

                  {/* Scan Types */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-4">
                      Select Scan Types *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {scanTypeOptions.map((scanType) => (
                        <motion.div
                          key={scanType.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleScanTypeToggle(scanType.id)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            formData.scanTypes.includes(scanType.id)
                              ? 'border-cyber-blue bg-cyber-blue/10'
                              : 'border-gray-600 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-center mb-2">
                            <div className={`mr-3 ${
                              formData.scanTypes.includes(scanType.id)
                                ? 'text-cyber-blue'
                                : 'text-gray-400'
                            }`}>
                              {scanType.icon}
                            </div>
                            <h4 className="font-semibold">{scanType.name}</h4>
                          </div>
                          <p className="text-sm text-gray-400">{scanType.description}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Notification Email *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          value={formData.notificationEmail}
                          onChange={(e) => handleInputChange('notificationEmail', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                          placeholder="your-email@example.com"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Receive notifications about security findings
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Minimum Severity for Alerts
                      </label>
                      <select
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                        defaultValue="MEDIUM"
                      >
                        <option value="LOW">Low and above</option>
                        <option value="MEDIUM">Medium and above</option>
                        <option value="HIGH">High and above</option>
                        <option value="CRITICAL">Critical only</option>
                      </select>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-dark-card border border-dark-border rounded-lg p-6 mt-6">
                    <h4 className="font-semibold mb-4 flex items-center">
                      <Check className="w-4 h-4 mr-2 text-cyber-green" />
                      Project Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Name:</span>
                        <span className="ml-2 text-white">{formData.name || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Project ID:</span>
                        <span className="ml-2 text-white">{formData.gitlabProjectId || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Branch:</span>
                        <span className="ml-2 text-white">{formData.branch}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Frequency:</span>
                        <span className="ml-2 text-white">{formData.scanFrequency.replace('_', ' ')}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Scan Types:</span>
                        <span className="ml-2 text-white">
                          {formData.scanTypes.length > 0
                            ? formData.scanTypes.join(', ').replace(/_/g, ' ')
                            : 'None selected'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6"
              >
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                  <p className="text-red-400">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-dark-border">
              <div>
                {currentStep > 1 && (
                  <motion.button
                    onClick={prevStep}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                  >
                    Previous
                  </motion.button>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <motion.button
                  onClick={handleClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-gray-400 hover:text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </motion.button>

                {currentStep < 3 ? (
                  <motion.button
                    onClick={nextStep}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-cyber-blue hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                  >
                    Next
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleSubmit}
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.05 }}
                    whileTap={{ scale: loading ? 1 : 0.95 }}
                    className="bg-cyber-green hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center"
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Creating Project...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Create Project
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProjectSetup;
