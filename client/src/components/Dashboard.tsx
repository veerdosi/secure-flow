import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { analysisAPI, projectAPI } from '../utils/api';
import { SecurityAnalysis, Project, Vulnerability } from '../types';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { useWebhookHandler } from '../hooks/useWebhookHandler';
import ThreatModelVisualization from './ThreatModelVisualization';
import RealTimeAnalysisFeed from './RealTimeAnalysisFeed';
import VulnerabilityHeatmap from './VulnerabilityHeatmap';
import AnalysisHistory from './AnalysisHistory';
import RemediationApproval from './RemediationApproval';
import {
  Clock,
  AlertTriangle,
  Shield,
  Activity,
  FileText,
  RefreshCw,
  Play,
  Settings,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Eye,
  Zap,
  Target,
  Database,
  Users,
  CheckCircle,
  XCircle,
  PlayCircle
} from 'lucide-react';

interface DashboardProps {
  projectId?: string;
  projectData?: Project;
}

const Dashboard = ({ projectId: propProjectId, projectData }: DashboardProps) => {
  const router = useRouter();
  const { projectId: routerProjectId } = router.query;
  const projectId = propProjectId || routerProjectId;
  
  const { getAnalysisData, setAnalysisData, refreshAnalysis, isStale } = useAnalysisData();
  useWebhookHandler(); // Re-enabled with SWR error handling
  
  const [analysis, setAnalysis] = useState<SecurityAnalysis | null>(null);
  const [project, setProject] = useState<Project | null>(projectData || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Track client-side mount to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't start loading data until router is ready, component is mounted, and we have a projectId
  // Also ensure Zustand has finished hydrating to prevent race conditions
  const isReady = mounted && router.isReady && projectId;

  useEffect(() => {
    if (projectData) {
      setProject(projectData);
      setLoading(false);
    }
  }, [projectData]);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isReady || !isMounted) return;
      
      try {
        if (!projectData) {
          await fetchProjectData();
        }
        if (isMounted) {
          await loadAnalysisData();
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error loading dashboard data:', error);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [isReady, projectData]);

  const loadAnalysisData = useCallback(async () => {
    if (!isReady) return;
    
    // Check cache first
    const cachedAnalysis = getAnalysisData(projectId as string);
    
    if (cachedAnalysis && !isStale(projectId as string)) {
      // Use cached data
      setAnalysis(cachedAnalysis);
      setLoading(false);
      // console.log('Using cached analysis data'); // Removed console logging for production
      return;
    }
    
    // Fetch fresh data if cache is stale or missing
    setLoading(true);
    try {
      const analyses = await analysisAPI.getByProject(projectId as string, 1);

      if (analyses && Array.isArray(analyses) && analyses.length > 0) {
        const latestAnalysis = analyses[0];
        
        if (!latestAnalysis) {
          setAnalysis(null);
          setLoading(false);
          return;
        }

        const formattedAnalysis: SecurityAnalysis = {
          id: latestAnalysis._id || '',
          projectId: latestAnalysis.projectId || projectId as string,
          commitHash: latestAnalysis.commitHash || '',
          timestamp: latestAnalysis.createdAt || new Date().toISOString(),
          securityScore: typeof latestAnalysis.securityScore === 'number' ? latestAnalysis.securityScore : 0,
          threatLevel: latestAnalysis.threatLevel || 'LOW',
          vulnerabilities: Array.isArray(latestAnalysis.vulnerabilities) ? latestAnalysis.vulnerabilities : [],
          threatModel: latestAnalysis.threatModel && typeof latestAnalysis.threatModel === 'object' 
            ? { 
                nodes: Array.isArray(latestAnalysis.threatModel.nodes) ? latestAnalysis.threatModel.nodes : [],
                edges: Array.isArray(latestAnalysis.threatModel.edges) ? latestAnalysis.threatModel.edges : [],
                ...latestAnalysis.threatModel
              }
            : { nodes: [], edges: [] },
          aiAnalysis: typeof latestAnalysis.aiAnalysis === 'string' ? latestAnalysis.aiAnalysis : '',
          remediationSteps: Array.isArray(latestAnalysis.remediationSteps) ? latestAnalysis.remediationSteps : [],
          complianceScore: latestAnalysis.complianceScore && typeof latestAnalysis.complianceScore === 'object' 
            ? latestAnalysis.complianceScore : {},
          userId: latestAnalysis.userId || '',
          status: latestAnalysis.status || 'COMPLETED',
          proposedRemediations: Array.isArray(latestAnalysis.proposedRemediations) ? latestAnalysis.proposedRemediations : [],
          humanApproval: latestAnalysis.humanApproval
        };

        setAnalysis(formattedAnalysis);
        
        // Cache the analysis data
        setAnalysisData(projectId as string, {
          vulnerabilities: formattedAnalysis.vulnerabilities,
          summary: {
            securityScore: formattedAnalysis.securityScore,
            threatLevel: formattedAnalysis.threatLevel,
            aiAnalysis: formattedAnalysis.aiAnalysis,
            complianceScore: formattedAnalysis.complianceScore
          },
          scanId: formattedAnalysis.id,
          lastScan: Date.now()
        });
        
        // Check if this analysis needs human approval
        if (latestAnalysis.status === 'AWAITING_APPROVAL' && latestAnalysis.proposedRemediations?.length > 0) {
          setPendingApproval(latestAnalysis);
          setShowApprovalModal(true);
        }
      }
    } catch (error: any) {
      setError('Failed to load analysis data');
    } finally {
      setLoading(false);
    }
  }, [isReady, projectId, getAnalysisData, isStale, setAnalysisData]);

  const fetchProjectData = async () => {
    if (!isReady) return;
    
    try {
      const projectData = await projectAPI.getById(projectId as string);
      setProject(projectData);
      setError(null);
    } catch (error: any) {
      // console.error('Failed to fetch project:', error); // Commented out to prevent client-side error visibility
      setError('Failed to load project data');
    }
  };

  const fetchLatestAnalysis = useCallback(async () => {
    try {
      const analyses = await analysisAPI.getByProject(projectId as string, 1);

      if (analyses && analyses.length > 0) {
        const latestAnalysis = analyses[0];

        const formattedAnalysis: SecurityAnalysis = {
          id: latestAnalysis._id,
          projectId: latestAnalysis.projectId,
          commitHash: latestAnalysis.commitHash,
          timestamp: latestAnalysis.createdAt,
          securityScore: latestAnalysis.securityScore || 0,
          threatLevel: latestAnalysis.threatLevel,
          vulnerabilities: latestAnalysis.vulnerabilities || [],
          threatModel: latestAnalysis.threatModel || { nodes: [], edges: [] },
          aiAnalysis: latestAnalysis.aiAnalysis || '',
          remediationSteps: latestAnalysis.remediationSteps || [],
          complianceScore: latestAnalysis.complianceScore || {},
          userId: latestAnalysis.userId || '',
          status: latestAnalysis.status || 'COMPLETED',
          proposedRemediations: latestAnalysis.proposedRemediations || [],
          humanApproval: latestAnalysis.humanApproval
        };

        setAnalysis(formattedAnalysis);
        
        // Cache the analysis data
        setAnalysisData(projectId as string, {
          vulnerabilities: formattedAnalysis.vulnerabilities,
          summary: {
            securityScore: formattedAnalysis.securityScore,
            threatLevel: formattedAnalysis.threatLevel,
            aiAnalysis: formattedAnalysis.aiAnalysis,
            complianceScore: formattedAnalysis.complianceScore
          },
          scanId: formattedAnalysis.id,
          lastScan: Date.now()
        });
        
        // Check if this analysis needs human approval
        if (latestAnalysis.status === 'AWAITING_APPROVAL' && latestAnalysis.proposedRemediations?.length > 0) {
          setPendingApproval(latestAnalysis);
          setShowApprovalModal(true);
        }
      }
    } catch (error: any) {
      // console.error('Failed to fetch analysis:', error); // Commented out to prevent client-side error visibility
      // Error is handled gracefully by UI state, no need to log to console
    }
  }, [projectId, setAnalysisData]);

  // Auto-refresh analysis data when the component becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isReady) {
        // Page became visible again, refresh analysis data
        fetchLatestAnalysis();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isReady, fetchLatestAnalysis]);

  const handleApprovalUpdate = () => {
    setShowApprovalModal(false);
    setPendingApproval(null);
    fetchLatestAnalysis(); // Refresh data after approval
  };

  const getAnalysisStatusInfo = () => {
    if (!analysis) return { status: 'No Analysis', color: 'bg-gray-500/20 text-gray-400 border-gray-500/50', icon: null };
    
    switch (analysis.status) {
      case 'PENDING':
        return { status: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: <Clock className="w-3 h-3" /> };
      case 'IN_PROGRESS':
        return { status: 'Running', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: <PlayCircle className="w-3 h-3" /> };
      case 'AWAITING_APPROVAL':
        return { status: 'Needs Approval', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', icon: <AlertTriangle className="w-3 h-3" /> };
      case 'COMPLETED':
        return { status: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: <CheckCircle className="w-3 h-3" /> };
      case 'FAILED':
        return { status: 'Failed', color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: <XCircle className="w-3 h-3" /> };
      default:
        return { status: 'Unknown', color: 'bg-gray-500/20 text-gray-400 border-gray-500/50', icon: null };
    }
  };

  const handleRunAnalysis = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const result = await analysisAPI.start({ projectId: projectId as string });
      
      // Redirect to the analysis page using the returned analysisId
      if (result && result.analysisId) {
        router.push(`/analysis/${result.analysisId}`);
      } else {
        // Fallback: refresh the current dashboard to show updated analysis
        setError(null);
        setLoading(false);
        fetchLatestAnalysis();
      }
    } catch (error: any) {
      // console.error('Failed to start analysis:', error); // Commented out to prevent client-side error visibility
      setError('Failed to start analysis');
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'LOW': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-cyber-green';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getVulnerabilityStats = () => {
    if (!analysis?.vulnerabilities) return { critical: 0, high: 0, medium: 0, low: 0 };

    return analysis.vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity.toLowerCase() as keyof typeof acc]++;
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 });
  };

  const SecurityScoreRing = ({ score }: { score: number }) => {
    const circumference = 2 * Math.PI * 45;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="rgb(55, 65, 81)"
            strokeWidth="8"
            fill="transparent"
            className="opacity-20"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            stroke={score >= 80 ? 'rgb(57, 255, 20)' : score >= 60 ? 'rgb(251, 191, 36)' : score >= 40 ? 'rgb(251, 146, 60)' : 'rgb(248, 113, 113)'}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="drop-shadow-sm"
            style={{ filter: 'drop-shadow(0 0 8px rgba(57, 255, 20, 0.3))' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className={`text-3xl font-bold ${getSecurityScoreColor(score)}`}
            >
              {score}
            </motion.div>
            <div className="text-gray-400 text-sm font-medium">/100</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-cyber-blue border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-400">Loading dashboard...</p>
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
        </div>
      </div>
    );
  }

  if (!mounted || !project) {
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

  const vulnStats = getVulnerabilityStats();

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/projects')}
                className="flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span className="text-sm">Back to Projects</span>
              </button>
              <div className="h-6 w-px bg-gray-600" />
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <Shield className="w-6 h-6 text-cyber-blue mr-3" />
                  {project.name}
                </h1>
                <p className="text-gray-400 text-sm">
                  <span className="text-gray-500">Project: </span>
                  {project.repositoryUrl?.split('/').pop() || 'Unknown'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {(() => {
                const statusInfo = getAnalysisStatusInfo();
                return (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center space-x-1 ${statusInfo.color}`}>
                    {statusInfo.icon}
                    <span>{statusInfo.status}</span>
                  </span>
                );
              })()}
              {analysis && (
                <span className="text-gray-400 text-sm flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Last scan: {formatTimestamp(analysis.timestamp)}
                </span>
              )}
              {analysis?.status === 'AWAITING_APPROVAL' && (
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1 rounded-lg transition-colors flex items-center"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Review Required
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={fetchLatestAnalysis}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 bg-dark-card hover:bg-gray-800 hover:border-gray-500 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => router.push(`/projects/${projectId}/settings`)}
                  className="inline-flex items-center px-3 py-2 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 bg-dark-card hover:bg-gray-800 hover:border-gray-500 transition-colors"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </button>
                <button
                  onClick={handleRunAnalysis}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-black bg-cyber-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? 'Running...' : 'Run Analysis'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {analysis ? (
          <div className="space-y-8">
            {/* Top Row - Key Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Security Score */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Security Score</h3>
                  <TrendingUp className="w-5 h-5 text-cyber-green" />
                </div>
                <SecurityScoreRing score={analysis.securityScore} />
                <div className="mt-4 text-center">
                  <p className="text-gray-400 text-sm">
                    Overall security posture of your project
                  </p>
                </div>
              </motion.div>

              {/* Threat Level */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Threat Level</h3>
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>

                <div className="text-center mb-4">
                  <div className="flex items-center justify-center mb-2">
                    <AlertTriangle className="w-8 h-8 text-orange-400 mr-2" />
                  </div>
                  <div className={`inline-flex px-4 py-2 rounded-lg text-lg font-bold border ${getThreatLevelColor(analysis.threatLevel)}`}>
                    {analysis.threatLevel}
                  </div>
                </div>

                <div className="bg-dark-bg/50 rounded-lg p-4 border border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-400 text-sm font-medium">High Risk Issues</span>
                    <span className="text-white text-lg font-bold">
                      {vulnStats.critical + vulnStats.high}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">Immediate attention required</p>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-400">Risk Level</span>
                  <div className="flex-1 mx-3">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-1000"
                        style={{
                          width: analysis.threatLevel === 'CRITICAL' ? '100%' :
                                 analysis.threatLevel === 'HIGH' ? '75%' :
                                 analysis.threatLevel === 'MEDIUM' ? '50%' : '25%'
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-orange-400 font-medium">{analysis.threatLevel}</span>
                </div>
              </motion.div>

              {/* System Components Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">System Components</h3>
                  <Target className="w-5 h-5 text-cyber-blue" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-cyber-green rounded-full mr-3"></div>
                      <span className="text-gray-300 text-sm">Secure</span>
                    </div>
                    <span className="text-white font-semibold">
                      {analysis.threatModel?.nodes?.filter(n => n.riskLevel === 'LOW').length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                      <span className="text-gray-300 text-sm">Medium Risk</span>
                    </div>
                    <span className="text-white font-semibold">
                      {analysis.threatModel?.nodes?.filter(n => n.riskLevel === 'MEDIUM').length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-400 rounded-full mr-3"></div>
                      <span className="text-gray-300 text-sm">Vulnerable</span>
                    </div>
                    <span className="text-white font-semibold">
                      {analysis.threatModel?.nodes?.filter(n => n.riskLevel === 'HIGH' || n.riskLevel === 'CRITICAL').length || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-700">
                  <p className="text-gray-400 text-xs text-center">
                    Interactive 3D threat model
                    <br />
                    <span className="text-gray-500">Animated data flows and vulnerabilities</span>
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Interactive Threat Model - Takes full width on large screens */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-2 bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Interactive Threat Model</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">Interactive 3D threat model</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Activity className="w-4 h-4 text-cyber-blue" />
                      <span className="text-gray-400">Animated data flows and vulnerabilities</span>
                    </div>
                  </div>
                </div>
                <div className="h-96 bg-dark-bg/30 rounded-lg border border-gray-700">
                  <ThreatModelVisualization threatModel={analysis.threatModel} />
                </div>
              </motion.div>

              {/* Analysis History */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <AnalysisHistory projectId={projectId as string} timeRange={30} />
              </motion.div>

              {/* Real-Time Analysis Feed */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Real-Time Analysis Feed</h3>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-cyber-green rounded-full animate-pulse"></div>
                    <span className="text-cyber-green text-sm font-medium">Live stream of AI findings</span>
                  </div>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
                  <RealTimeAnalysisFeed analysis={analysis} />
                </div>
              </motion.div>

              {/* Code Vulnerability Heatmap */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="lg:col-span-2 bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Code Vulnerability Heatmap</h3>
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Project Files</span>
                    <span className="text-gray-500 text-xs">Risk Levels</span>
                  </div>
                  <div className="flex items-center justify-end space-x-4 text-xs">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                      <span className="text-gray-400">Critical</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-orange-500 rounded mr-1"></div>
                      <span className="text-gray-400">High</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
                      <span className="text-gray-400">Medium</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                      <span className="text-gray-400">Low</span>
                    </div>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto scrollbar-thin">
                  <VulnerabilityHeatmap vulnerabilities={analysis.vulnerabilities} />
                </div>
              </motion.div>
            </div>

            {/* Bottom Section - Additional Details */}
            {analysis.aiAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">AI Security Analysis</h3>
                  <Zap className="w-5 h-5 text-cyber-blue" />
                </div>
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 leading-relaxed">{analysis.aiAnalysis}</p>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Empty State - Top Row with placeholder widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Security Score */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Security Score</h3>
                  <TrendingUp className="w-5 h-5 text-gray-500" />
                </div>
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-gray-500 mb-2">--</div>
                      <div className="text-gray-500 text-sm">/100</div>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mt-4">
                    Run analysis to get security score
                  </p>
                </div>
              </motion.div>

              {/* Threat Level */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Threat Level</h3>
                  <AlertTriangle className="w-5 h-5 text-gray-500" />
                </div>
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center mb-2">
                    <AlertTriangle className="w-8 h-8 text-gray-500 mr-2" />
                  </div>
                  <div className="inline-flex px-4 py-2 rounded-lg text-lg font-bold border bg-gray-500/20 text-gray-500 border-gray-500/50">
                    UNKNOWN
                  </div>
                </div>
                <div className="bg-dark-bg/50 rounded-lg p-4 border border-gray-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-sm font-medium">Vulnerabilities</span>
                    <span className="text-gray-500 text-lg font-bold">--</span>
                  </div>
                  <p className="text-gray-500 text-xs">Run analysis to scan for issues</p>
                </div>
              </motion.div>

              {/* System Components */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">System Components</h3>
                  <Target className="w-5 h-5 text-gray-500" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                      <span className="text-gray-500 text-sm">Secure</span>
                    </div>
                    <span className="text-gray-500 font-semibold">--</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                      <span className="text-gray-500 text-sm">Medium Risk</span>
                    </div>
                    <span className="text-gray-500 font-semibold">--</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                      <span className="text-gray-500 text-sm">Vulnerable</span>
                    </div>
                    <span className="text-gray-500 font-semibold">--</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-700">
                  <p className="text-gray-500 text-xs text-center">
                    No analysis data available
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Empty threat model visualization */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Interactive Threat Model</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">No data available</span>
                  </div>
                </div>
              </div>
              <div className="h-96 bg-dark-bg/30 rounded-lg border border-gray-700 flex items-center justify-center">
                <div className="text-center">
                  <Shield className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                  <h4 className="text-xl font-semibold text-white mb-2">No Security Analysis Yet</h4>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Run your first security analysis to get comprehensive insights about your project's security posture.
                  </p>
                  <button
                    onClick={handleRunAnalysis}
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-black bg-cyber-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    {loading ? 'Starting Analysis...' : 'Run First Analysis'}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Empty analysis history and feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Analysis History</h3>
                  <Activity className="w-5 h-5 text-gray-500" />
                </div>
                <div className="text-center py-8">
                  <Database className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-500 text-sm">No analysis history available</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Real-Time Analysis Feed</h3>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <span className="text-gray-500 text-sm font-medium">Waiting for analysis</span>
                  </div>
                </div>
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-500 text-sm">No real-time data available</p>
                </div>
              </motion.div>
            </div>

            {/* Empty vulnerability heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Code Vulnerability Heatmap</h3>
                <FileText className="w-5 h-5 text-gray-500" />
              </div>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-500 text-sm">No vulnerability data available</p>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Human-in-the-Loop Approval Modal */}
      {showApprovalModal && pendingApproval && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <RemediationApproval
                analysisId={pendingApproval.id || pendingApproval._id}
                proposedRemediations={pendingApproval.proposedRemediations || []}
                humanApproval={pendingApproval.humanApproval || { 
                  status: 'PENDING', 
                  approvedActions: [], 
                  rejectedActions: [] 
                }}
                onApprovalUpdate={handleApprovalUpdate}
              />
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
