import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { analysisAPI, projectAPI } from '../../utils/api';
import { SecurityAnalysis, Project } from '../../types';
import ThreatModelVisualization from '../../components/ThreatModelVisualization';
import RealTimeAnalysisFeed from '../../components/RealTimeAnalysisFeed';
import VulnerabilityHeatmap from '../../components/VulnerabilityHeatmap';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  RefreshCw,
  Play,
  Target,
  Database,
  Zap,
  FileText,
  TrendingUp,
} from 'lucide-react';

const AnalysisPage: React.FC = () => {
  const router = useRouter();
  const { id: analysisId } = router.query;
  
  const [analysis, setAnalysis] = useState<SecurityAnalysis | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(10000); // Start with 10 seconds
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!analysisId) return;

    // Initial fetch
    fetchAnalysis();

    // Smart polling with rate limit respect and exponential backoff
    let timeoutId: NodeJS.Timeout;
    let mounted = true;

    const scheduleNextPoll = (delay: number = pollingInterval) => {
      if (!mounted) return;
      
      timeoutId = setTimeout(() => {
        if (mounted && analysis?.status && ['PENDING', 'IN_PROGRESS'].includes(analysis.status)) {
          fetchAnalysisUpdate().finally(() => {
            // Schedule next poll with current interval
            scheduleNextPoll();
          });
        }
      }, delay);
    };

    // Start polling after initial fetch, but only if analysis is in progress
    const initialPollDelay = setTimeout(() => {
      if (mounted && analysis?.status && ['PENDING', 'IN_PROGRESS'].includes(analysis.status)) {
        scheduleNextPoll();
      }
    }, pollingInterval);

    // Cleanup function
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      clearTimeout(initialPollDelay);
    };
  }, [analysisId]); // ✅ FIXED: Removed `loading` from dependencies

  // Separate effect to handle polling state changes
  useEffect(() => {
    if (analysis?.status && !['PENDING', 'IN_PROGRESS'].includes(analysis.status)) {
      // Analysis completed or failed, reset polling state
      setPollingInterval(10000);
      setRetryCount(0);
    }
  }, [analysis?.status]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const analysisData = await analysisAPI.getById(analysisId as string);
      
      if (analysisData) {
        const formattedAnalysis: SecurityAnalysis = {
          id: analysisData._id,
          projectId: analysisData.projectId,
          commitHash: analysisData.commitHash,
          timestamp: analysisData.createdAt,
          securityScore: analysisData.securityScore || 0,
          threatLevel: analysisData.threatLevel || 'LOW',
          vulnerabilities: analysisData.vulnerabilities || [],
          threatModel: analysisData.threatModel || {
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
          aiAnalysis: analysisData.aiAnalysis || '',
          remediationSteps: analysisData.remediationSteps || [],
          complianceScore: analysisData.complianceScore || {
            owasp: 0,
            pci: 0,
            sox: 0,
            gdpr: 0,
            iso27001: 0
          },
          status: analysisData.status,
          stage: analysisData.stage,
          progress: analysisData.progress || 0,
          userId: analysisData.userId || ''
        };

        setAnalysis(formattedAnalysis);

        // Fetch project data if needed
        if (analysisData.projectId && !project) {
          try {
            const projectData = await projectAPI.getById(analysisData.projectId);
            setProject(projectData);
          } catch (projectError) {
            console.warn('Failed to fetch project data:', projectError);
            // Don't block the analysis view if project fetch fails
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch analysis:', error);
      
      if (error.response?.status === 429) {
        setError('Rate limited. Please wait a moment before refreshing.');
        // Start with longer delay if initially rate limited
        setPollingInterval(30000); // 30 seconds
      } else if (error.response?.status === 404) {
        setError('Analysis not found');
      } else {
        setError('Failed to load analysis data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysisUpdate = async () => {
    if (!analysisId || polling) return;
    
    try {
      setPolling(true);
      const analysisData = await analysisAPI.getById(analysisId as string);
      
      if (analysisData && analysis) {
        setAnalysis(prev => prev ? {
          ...prev,
          status: analysisData.status,
          stage: analysisData.stage,
          progress: analysisData.progress || 0,
          securityScore: analysisData.securityScore || prev.securityScore,
          threatLevel: analysisData.threatLevel || prev.threatLevel,
          vulnerabilities: analysisData.vulnerabilities || prev.vulnerabilities,
          threatModel: analysisData.threatModel || prev.threatModel,
          aiAnalysis: analysisData.aiAnalysis || prev.aiAnalysis,
          remediationSteps: analysisData.remediationSteps || prev.remediationSteps,
          complianceScore: analysisData.complianceScore || prev.complianceScore,
        } : null);

        // Reset retry count on successful request
        setRetryCount(0);
        setPollingInterval(10000); // Reset to normal interval
      }
    } catch (error: any) {
      console.warn('Failed to update analysis:', error);
      
      // Handle 429 (Too Many Requests) specifically
      if (error.response?.status === 429) {
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        
        // Exponential backoff: 10s, 20s, 40s, 60s (max)
        const backoffDelay = Math.min(10000 * Math.pow(2, newRetryCount), 60000);
        setPollingInterval(backoffDelay);
        
        console.warn(`Rate limited. Backing off to ${backoffDelay/1000}s intervals.`);
      } else if (error.response?.status === 404) {
        // Analysis might have been deleted, stop polling
        setError('Analysis not found');
      }
    } finally {
      setPolling(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'IN_PROGRESS':
        return <Activity className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'FAILED':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const ProgressBar = ({ progress }: { progress: number }) => (
    <div className="w-full bg-gray-700 rounded-full h-2.5">
      <motion.div
        className="bg-cyber-blue h-2.5 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-cyber-blue border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-400">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg text-white p-6">
        <div className="max-w-md mx-auto mt-20 bg-red-500/10 border border-red-500/50 rounded-xl p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-400 mr-3" />
            <p className="text-red-400">{error}</p>
          </div>
          <button
            onClick={() => router.push('/projects')}
            className="mt-4 px-4 py-2 bg-dark-card border border-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-dark-bg text-white p-6">
        <div className="max-w-md mx-auto mt-20 bg-red-500/10 border border-red-500/50 rounded-xl p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-400 mr-3" />
            <p className="text-red-400">Analysis not found</p>
          </div>
          <button
            onClick={() => router.push('/projects')}
            className="mt-4 px-4 py-2 bg-dark-card border border-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const isInProgress = analysis.status === 'PENDING' || analysis.status === 'IN_PROGRESS';
  const isCompleted = analysis.status === 'COMPLETED';

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => project ? router.push(`/dashboard?projectId=${project._id}`) : router.push('/projects')}
                className="flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span className="text-sm">Back to {project ? 'Dashboard' : 'Projects'}</span>
              </button>
              <div className="h-6 w-px bg-gray-600" />
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <Shield className="w-6 h-6 text-cyber-blue mr-3" />
                  Security Analysis
                </h1>
                <p className="text-gray-400 text-sm">
                  {project && (
                    <>
                      <span className="text-gray-500">Project: </span>
                      {project.name}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(analysis.status)}
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(analysis.status)}`}>
                  {analysis.status}
                </span>
              </div>
              {retryCount > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-yellow-400 text-xs">
                    Rate limited - polling every {pollingInterval/1000}s
                  </span>
                </div>
              )}
              {analysis.timestamp && (
                <span className="text-gray-400 text-sm flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Started: {formatTimestamp(analysis.timestamp)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isInProgress ? (
          /* Analysis in Progress */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Progress Section */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-8">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-cyber-blue border-t-transparent rounded-full"
                  />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-2">Analysis in Progress</h3>
                <p className="text-gray-400 mb-4">
                  Our AI is analyzing your code for security vulnerabilities and generating a threat model...
                </p>
                <div className="max-w-md mx-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">{analysis.stage || 'INITIALIZING'}</span>
                    <span className="text-sm text-gray-400">{analysis.progress || 0}%</span>
                  </div>
                  <ProgressBar progress={analysis.progress || 0} />
                </div>
              </div>

              {/* Progress Stages */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { stage: 'INITIALIZING', icon: RefreshCw, label: 'Initializing' },
                  { stage: 'FETCHING_CODE', icon: Database, label: 'Fetching Code' },
                  { stage: 'STATIC_ANALYSIS', icon: Target, label: 'Static Analysis' },
                  { stage: 'AI_ANALYSIS', icon: Zap, label: 'AI Analysis' },
                ].map((step, index) => (
                  <div
                    key={step.stage}
                    className={`p-4 rounded-lg border text-center transition-colors ${
                      analysis.stage === step.stage
                        ? 'bg-cyber-blue/20 border-cyber-blue/50 text-white'
                        : analysis.progress && analysis.progress > index * 25
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'bg-gray-500/20 border-gray-500/50 text-gray-400'
                    }`}
                  >
                    <step.icon className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-sm font-medium">{step.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Real-time Updates */}
            {analysis && (
              <div className="bg-dark-card border border-dark-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Activity className="w-5 h-5 text-cyber-blue mr-2" />
                  Real-Time Updates
                </h3>
                <RealTimeAnalysisFeed analysis={analysis} />
              </div>
            )}
          </motion.div>
        ) : isCompleted ? (
          /* Analysis Completed - Show Full Results */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Success Banner */}
            <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-400 mr-4" />
                <div>
                  <h3 className="text-xl font-semibold text-white">Analysis Completed Successfully</h3>
                  <p className="text-green-400">Your security analysis is ready. View the results below.</p>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => project && router.push(`/dashboard?projectId=${project._id}`)}
                    className="px-4 py-2 bg-cyber-blue text-black rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    View Dashboard
                  </button>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Security Score */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 text-cyber-green mr-2" />
                  Security Score
                </h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-cyber-green mb-2">
                    {analysis.securityScore}/100
                  </div>
                  <p className="text-gray-400">Overall security posture</p>
                </div>
              </div>

              {/* Threat Level */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 text-orange-400 mr-2" />
                  Threat Level
                </h3>
                <div className="text-center">
                  <div className={`inline-flex px-4 py-2 rounded-lg text-lg font-bold border ${
                    analysis.threatLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                    analysis.threatLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                    analysis.threatLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                    'bg-green-500/20 text-green-400 border-green-500/50'
                  }`}>
                    {analysis.threatLevel}
                  </div>
                </div>
              </div>

              {/* Threat Model */}
              <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Target className="w-5 h-5 text-cyber-blue mr-2" />
                  Interactive Threat Model
                </h3>
                <div className="h-96 bg-dark-bg/30 rounded-lg border border-gray-700">
                  <ThreatModelVisualization threatModel={analysis.threatModel} />
                </div>
              </div>

              {/* Vulnerabilities */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <FileText className="w-5 h-5 text-gray-400 mr-2" />
                  Vulnerability Heatmap
                </h3>
                <div className="max-h-64 overflow-y-auto">
                  <VulnerabilityHeatmap vulnerabilities={analysis.vulnerabilities} />
                </div>
              </div>

              {/* AI Analysis */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Zap className="w-5 h-5 text-cyber-blue mr-2" />
                  AI Analysis Summary
                </h3>
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 leading-relaxed">
                    {analysis.aiAnalysis || 'AI analysis is being processed...'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Failed Analysis */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/50 rounded-xl p-8 text-center"
          >
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-white mb-2">Analysis Failed</h3>
            <p className="text-red-400 mb-6">
              The security analysis encountered an error and could not be completed.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => project && router.push(`/dashboard?projectId=${project._id}`)}
                className="px-4 py-2 bg-dark-card border border-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={fetchAnalysis}
                className="px-4 py-2 bg-cyber-blue text-black rounded-lg hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;