import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { analysisAPI, projectAPI } from '../utils/api';
import { SecurityAnalysis, Project, Vulnerability } from '../types';
import ThreatModelVisualization from './ThreatModelVisualization';
import RealTimeAnalysisFeed from './RealTimeAnalysisFeed';
import VulnerabilityHeatmap from './VulnerabilityHeatmap';
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
  Users
} from 'lucide-react';

interface DashboardProps {
  projectId?: string;
  projectData?: Project;
}

const Dashboard: React.FC<DashboardProps> = ({ projectId: propProjectId, projectData }) => {
  const router = useRouter();
  const { projectId: routerProjectId } = router.query;
  const projectId = propProjectId || routerProjectId;
  const [analysis, setAnalysis] = useState<SecurityAnalysis | null>(null);
  const [project, setProject] = useState<Project | null>(projectData || null);
  const [loading, setLoading] = useState(!projectData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectData) {
      setProject(projectData);
      setLoading(false);
    }
  }, [projectData]);

  useEffect(() => {
    if (projectId) {
      if (!projectData) {
        fetchProjectData();
      }
      fetchLatestAnalysis();
    }
  }, [projectId, projectData]);

  const fetchProjectData = async () => {
    try {
      const projectData = await projectAPI.getById(projectId as string);
      setProject(projectData);
    } catch (error: any) {
      console.error('Failed to fetch project:', error);
      setError('Failed to load project data');
    }
  };

  const fetchLatestAnalysis = async () => {
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
          status: latestAnalysis.status,
          userId: latestAnalysis.userId || latestAnalysis.createdBy || ''
        };

        setAnalysis(formattedAnalysis);
      }
    } catch (error: any) {
      console.error('Failed to fetch analysis:', error);
      setError('Failed to load analysis data');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      await analysisAPI.start({ projectId: projectId as string });
      router.push(`/analysis/${projectId}`);
    } catch (error: any) {
      console.error('Failed to start analysis:', error);
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

  if (!project) {
    return (
      <div className="min-h-screen bg-dark-bg text-white p-6">
        <div className="max-w-md mx-auto mt-20 bg-red-500/10 border border-red-500/50 rounded-xl p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-400 mr-3" />
            <p className="text-red-400">Project not found</p>
          </div>
        </div>
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
                  {project.repositoryUrl.split('/').pop()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${analysis ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-gray-500/20 text-gray-400 border-gray-500/50'}`}>
                {analysis ? 'Analyzed' : 'Not Analyzed'}
              </span>
              {analysis && (
                <span className="text-gray-400 text-sm flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Last scan: {formatTimestamp(analysis.timestamp)}
                </span>
              )}
              <div className="flex gap-2">
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
                      {analysis.threatModel.nodes.filter(n => n.type === 'secure').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                      <span className="text-gray-300 text-sm">Medium Risk</span>
                    </div>
                    <span className="text-white font-semibold">
                      {analysis.threatModel.nodes.filter(n => n.type === 'medium').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-400 rounded-full mr-3"></div>
                      <span className="text-gray-300 text-sm">Vulnerable</span>
                    </div>
                    <span className="text-white font-semibold">
                      {analysis.threatModel.nodes.filter(n => n.type === 'vulnerable').length}
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

              {/* Real-Time Analysis Feed */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
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
                transition={{ delay: 0.6 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-dark-card border border-dark-border rounded-xl p-12 text-center"
          >
            <Shield className="h-16 w-16 mx-auto text-gray-600 mb-6" />
            <h3 className="text-2xl font-semibold text-white mb-3">No Security Analysis Yet</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Run your first security analysis to get comprehensive insights about your project's security posture,
              threat model, and vulnerability assessment.
            </p>
            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-black bg-cyber-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="h-5 w-5 mr-2" />
              {loading ? 'Starting Analysis...' : 'Run First Analysis'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
