'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, TrendingUp, Clock, GitBranch, Zap } from 'lucide-react';
import { SecurityAnalysis, AnalysisProgress } from '@/types';
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      // In real implementation, this would connect to Firebase/WebSocket
      fetchLatestAnalysis();
    }, 5000);

    fetchLatestAnalysis();
    return () => clearInterval(interval);
  }, [projectId]);

  const fetchLatestAnalysis = async () => {
    try {
      // Mock data for demo - replace with actual Firebase call
      const mockAnalysis: SecurityAnalysis = {
        id: 'analysis_uuid',
        projectId: 'webapp-api',
        commitHash: 'abc123def',
        timestamp: new Date().toISOString(),
        securityScore: 87,
        threatLevel: 'MEDIUM',
        vulnerabilities: [
          {
            id: 'vuln_1',
            type: 'SQL_INJECTION',
            severity: 'HIGH',
            file: 'auth.py',
            line: 47,
            description: 'SQL injection in login endpoint',
            suggestedFix: 'Use parameterized queries',
            owaspCategory: 'A03:2021',
            confidence: 0.95,
            exploitability: 0.8,
            impact: 0.9,
            fixComplexity: 'MEDIUM'
          }
        ],
        threatModel: {
          nodes: [],
          edges: [],
          attackVectors: [],
          attackSurface: {
            endpoints: 12,
            inputPoints: 8,
            outputPoints: 4,
            externalDependencies: 6,
            privilegedFunctions: 3
          }
        },
        aiAnalysis: 'Critical SQL injection vulnerability detected...',
        remediationSteps: [],
        complianceScore: {
          owasp: 0.78,
          pci: 0.65,
          sox: 0.72,
          gdpr: 0.85,
          iso27001: 0.71
        },
        status: 'COMPLETED'
      };

      setAnalysis(mockAnalysis);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
      setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="w-8 h-8 text-cyber-blue" />
              <h1 className="text-2xl font-bold">SecureFlow AI</h1>
              <span className="text-gray-400">[Project: {analysis?.projectId}]</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <GitBranch className="w-4 h-4" />
                <span>{analysis?.commitHash?.substring(0, 8)}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Last scan: {analysis?.timestamp ? new Date(analysis.timestamp).toLocaleTimeString() : 'Never'}</span>
              </div>
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
