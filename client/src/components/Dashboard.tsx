'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, TrendingUp, Clock, GitBranch, Zap } from 'lucide-react';
import { SecurityAnalysis, AnalysisProgress } from '@/types';
import { projectAPI, analysisAPI } from '@/utils/api';
import { UserProfile } from './UserProvider';
import SecurityScoreRing from './SecurityScoreRing';
import ThreatLevelIndicator from './ThreatLevelIndicator';
import RealTimeAnalysisFeed from './RealTimeAnalysisFeed';
import ThreatModelVisualization from './ThreatModelVisualization';
import VulnerabilityHeatmap from './VulnerabilityHeatmap';

interface DashboardProps {
  projectId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ projectId }) => {
  const [analysis, setAnalysis] = useState<SecurityAnalysis | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjectData();
    fetchLatestAnalysis();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      fetchLatestAnalysis();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const projectData = await projectAPI.getById(projectId);
      setProject(projectData);
    } catch (error: any) {
      console.error('Failed to fetch project:', error);
      setError('Failed to load project data');
    }
  };

  const fetchLatestAnalysis = async () => {
    try {
      const analyses = await analysisAPI.getByProject(projectId, 1);
      
      if (analyses && analyses.length > 0) {
        const latestAnalysis = analyses[0];
        
        // Convert backend data to frontend format
        const formattedAnalysis: SecurityAnalysis = {
          id: latestAnalysis._id,
          projectId: latestAnalysis.projectId,
          commitHash: latestAnalysis.commitHash,
          timestamp: latestAnalysis.createdAt,
          securityScore: latestAnalysis.securityScore || 0,
          threatLevel: latestAnalysis.threatLevel || 'LOW',
          vulnerabilities: latestAnalysis.vulnerabilities || [],
          threatModel: latestAnalysis.threatModel || {
            nodes: [],
            edges: [],
            attackVectors: [],
            attackSurface: {
              endpoints: 0,
              inputPoints: 0,
              outputPoints: 0,
              externalDependencies: 0,
              privilegedFunctions: 0
            }
          },
          aiAnalysis: latestAnalysis.aiAnalysis || '',
          remediationSteps: latestAnalysis.remediationSteps || [],
          complianceScore: latestAnalysis.complianceScore || {
            owasp: 0,
            pci: 0,
            sox: 0,
            gdpr: 0,
            iso27001: 0
          },
          status: latestAnalysis.status
        };

        setAnalysis(formattedAnalysis);

        // Set progress if analysis is still running
        if (latestAnalysis.status === 'IN_PROGRESS') {
          setProgress({
            stage: latestAnalysis.stage || 'Processing...',
            progress: latestAnalysis.progress || 0,
            message: `Analyzing ${latestAnalysis.commitHash?.substring(0, 8)}...`,
            startTime: latestAnalysis.startedAt || new Date().toISOString()
          });
        } else {
          setProgress(null);
        }
      } else {
        // No analysis found - show empty state
        setAnalysis(null);
      }
      
      setIsLoading(false);
    } catch (error: any) {
      console.error('Failed to fetch analysis:', error);
      setError('Failed to load analysis data');
      setIsLoading(false);
    }
  };

  const startManualScan = async () => {
    try {
      const response = await analysisAPI.start({
        projectId,
        triggeredBy: 'manual'
      });
      
      // Start polling for progress
      setProgress({
        stage: 'Initializing scan...',
        progress: 0,
        message: 'Starting security analysis',
        startTime: new Date().toISOString()
      });
      
      // Refresh data immediately
      setTimeout(fetchLatestAnalysis, 1000);
    } catch (error: any) {
      console.error('Failed to start scan:', error);
      setError('Failed to start security scan');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-cyber-blue border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Show empty state if no analysis exists
  if (!analysis && !progress && !isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white">
        {/* Header */}
        <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Shield className="w-8 h-8 text-cyber-blue" />
                <h1 className="text-2xl font-bold">SecureFlow AI</h1>
                <span className="text-gray-400">[Project: {project?.name || 'Loading...'}]</span>
              </div>
              <div className="flex items-center space-x-4">
                <motion.button
                  onClick={startManualScan}
                  disabled={!!progress}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-cyber-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {progress ? 'Scanning...' : 'Start Scan'}
                </motion.button>
                <UserProfile />
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="max-w-4xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Shield className="w-16 h-16 text-gray-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">No Security Analysis Available</h2>
            <p className="text-gray-400 mb-8">
              Start your first security scan to see real-time analysis, threat detection, and vulnerability insights.
            </p>

            <motion.button
              onClick={startManualScan}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-cyber-blue hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors inline-flex items-center"
            >
              <Zap className="w-6 h-6 mr-2" />
              Run Security Analysis
            </motion.button>

            {error && (
              <div className="mt-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="w-8 h-8 text-cyber-blue" />
              <h1 className="text-2xl font-bold">SecureFlow AI</h1>
              <span className="text-gray-400">[Project: {project?.name || 'Loading...'}]</span>
            </div>
            <div className="flex items-center space-x-4">
              {analysis && (
                <>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <GitBranch className="w-4 h-4" />
                    <span>{analysis.commitHash?.substring(0, 8) || 'No commits'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>Last scan: {analysis.timestamp ? new Date(analysis.timestamp).toLocaleTimeString() : 'Never'}</span>
                  </div>
                </>
              )}
              <motion.button
                onClick={startManualScan}
                disabled={!!progress}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-cyber-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center"
              >
                <Zap className="w-4 h-4 mr-2" />
                {progress ? 'Scanning...' : 'Start Scan'}
              </motion.button>
              <UserProfile />
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column - Scores and Status */}
          <div className="space-y-6">
            {/* Security Score */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Security Score</h3>
                <TrendingUp className="w-5 h-5 text-cyber-green" />
              </div>
              <SecurityScoreRing score={analysis?.securityScore || 0} size={120} />
            </motion.div>

            {/* Threat Level */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Threat Level</h3>
                <AlertTriangle className="w-5 h-5 text-cyber-orange" />
              </div>
              <ThreatLevelIndicator
                level={analysis?.threatLevel || 'LOW'}
                vulnerabilityCount={analysis?.vulnerabilities.length || 0}
              />
            </motion.div>

            {/* Analysis Progress */}
            {progress && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Real-time Analysis</h3>
                  <Zap className="w-5 h-5 text-cyber-blue" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">{progress.stage}</span>
                    <span className="text-sm font-mono">{progress.progress}% Complete</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <motion.div
                      className="bg-cyber-blue h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-sm text-gray-300">{progress.message}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Center Column - 3D Threat Model */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6 h-96"
            >
              <h3 className="text-lg font-semibold mb-4">Interactive Threat Model</h3>
              <ThreatModelVisualization threatModel={analysis?.threatModel} />
            </motion.div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">

          {/* Real-time Analysis Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-dark-card border border-dark-border rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Real-Time Analysis Feed</h3>
            <RealTimeAnalysisFeed analysis={analysis} />
          </motion.div>

          {/* Code Vulnerability Heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-dark-card border border-dark-border rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Code Vulnerability Heatmap</h3>
            <VulnerabilityHeatmap vulnerabilities={analysis?.vulnerabilities || []} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
