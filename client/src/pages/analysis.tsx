import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Shield,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  AlertTriangle,
  Calendar,
  FileText,
  TrendingUp,
  ArrowLeft,
  Play,
  Eye
} from 'lucide-react';
import { analysisAPI, projectAPI, handleApiError } from '../utils/api';
import { useUser } from '../components/UserProvider';

interface Analysis {
  _id: string;
  projectId: string;
  projectName?: string;
  commitHash: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'AWAITING_APPROVAL';
  stage?: string;
  progress?: number;
  securityScore: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilities: any[];
  triggeredBy: 'manual' | 'webhook' | 'scheduled';
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
}

interface Project {
  _id: string;
  name: string;
  gitlabProjectId: string;
}

const AnalysisListPage: React.FC = () => {
  const { user, loading } = useUser();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredAnalyses, setFilteredAnalyses] = useState<Analysis[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [threatLevelFilter, setThreatLevelFilter] = useState<string>('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    
    if (user) {
      loadData();
    }
  }, [user, loading]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      setError(null);
      
      // Load projects first
      const projectsData = await projectAPI.getAll();
      setProjects(projectsData);
      
      // Load all analyses for all projects
      const allAnalyses: Analysis[] = [];
      
      for (const project of projectsData) {
        try {
          const projectAnalyses = await analysisAPI.getByProject(project._id, 50);
          const analysesWithProjectName = projectAnalyses.map((analysis: any) => ({
            ...analysis,
            projectName: project.name
          }));
          allAnalyses.push(...analysesWithProjectName);
        } catch (error) {
          console.warn(`Failed to load analyses for project ${project.name}:`, error);
        }
      }
      
      // Sort by creation date (newest first)
      allAnalyses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setAnalyses(allAnalyses);
      setFilteredAnalyses(allAnalyses);
    } catch (error: any) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      console.error('Failed to load analyses:', errorMessage);
    } finally {
      setLoadingData(false);
    }
  };

  // Apply filters whenever filters or analyses change
  useEffect(() => {
    let filtered = [...analyses];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(analysis =>
        analysis.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        analysis.commitHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        analysis._id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(analysis => analysis.status === statusFilter);
    }

    // Project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(analysis => analysis.projectId === projectFilter);
    }

    // Threat level filter
    if (threatLevelFilter !== 'all') {
      filtered = filtered.filter(analysis => analysis.threatLevel === threatLevelFilter);
    }

    setFilteredAnalyses(filtered);
  }, [analyses, searchTerm, statusFilter, projectFilter, threatLevelFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'IN_PROGRESS':
        return <Activity className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'AWAITING_APPROVAL':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
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
      case 'AWAITING_APPROVAL':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-red-400';
      case 'HIGH':
        return 'text-orange-400';
      case 'MEDIUM':
        return 'text-yellow-400';
      case 'LOW':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleAnalysisClick = (analysisId: string) => {
    router.push(`/analysis/${analysisId}`);
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-cyber-blue border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-400">Loading analyses...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Security Analyses - SecureFlow AI</title>
      </Head>
      
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
                    Security Analyses
                  </h1>
                  <p className="text-gray-400 text-sm">
                    View all security scans and analysis results
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-gray-400 text-sm">
                  {filteredAnalyses.length} of {analyses.length} analyses
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {error ? (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 mb-8">
              <div className="flex items-center">
                <AlertTriangle className="h-6 w-6 text-red-400 mr-3" />
                <div>
                  <p className="text-red-400">{error}</p>
                  <button
                    onClick={loadData}
                    className="mt-2 text-sm text-gray-400 hover:text-white underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Filters */}
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search analyses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyber-blue focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-dark-bg border border-gray-600 rounded-lg text-white focus:border-cyber-blue focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="AWAITING_APPROVAL">Awaiting Approval</option>
              </select>

              {/* Project Filter */}
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="px-4 py-2 bg-dark-bg border border-gray-600 rounded-lg text-white focus:border-cyber-blue focus:outline-none"
              >
                <option value="all">All Projects</option>
                {projects.map(project => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>

              {/* Threat Level Filter */}
              <select
                value={threatLevelFilter}
                onChange={(e) => setThreatLevelFilter(e.target.value)}
                className="px-4 py-2 bg-dark-bg border border-gray-600 rounded-lg text-white focus:border-cyber-blue focus:outline-none"
              >
                <option value="all">All Threat Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setProjectFilter('all');
                  setThreatLevelFilter('all');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Analysis List */}
          {filteredAnalyses.length === 0 ? (
            <div className="bg-dark-card border border-dark-border rounded-xl p-12 text-center">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {analyses.length === 0 ? 'No Analyses Found' : 'No Matching Analyses'}
              </h3>
              <p className="text-gray-400 mb-6">
                {analyses.length === 0 
                  ? 'Start by running a security analysis on one of your projects.'
                  : 'Try adjusting your filters to see more results.'
                }
              </p>
              {analyses.length === 0 && (
                <button
                  onClick={() => router.push('/projects')}
                  className="bg-cyber-blue hover:bg-blue-600 text-black font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Go to Projects
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAnalyses.map((analysis) => (
                <motion.div
                  key={analysis._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-dark-card border border-dark-border rounded-xl p-6 hover:border-cyber-blue/50 transition-colors cursor-pointer"
                  onClick={() => handleAnalysisClick(analysis._id)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(analysis.status)}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(analysis.status)}`}>
                          {analysis.status}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {analysis.projectName || 'Unknown Project'}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Commit: {analysis.commitHash.substring(0, 8)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      {analysis.status === 'COMPLETED' && (
                        <>
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Security Score</p>
                            <p className={`text-lg font-bold ${getScoreColor(analysis.securityScore)}`}>
                              {analysis.securityScore}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Threat Level</p>
                            <p className={`text-lg font-bold ${getThreatLevelColor(analysis.threatLevel)}`}>
                              {analysis.threatLevel}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Vulnerabilities</p>
                            <p className="text-lg font-bold text-gray-300">
                              {analysis.vulnerabilities?.length || 0}
                            </p>
                          </div>
                        </>
                      )}
                      {analysis.status === 'IN_PROGRESS' && analysis.progress && (
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Progress</p>
                          <p className="text-lg font-bold text-blue-400">
                            {analysis.progress}%
                          </p>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Started</p>
                        <p className="text-sm text-gray-300">
                          {formatTimestamp(analysis.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="flex items-center">
                        <Play className="w-4 h-4 mr-1" />
                        Triggered by: {analysis.triggeredBy}
                      </span>
                      {analysis.stage && (
                        <span className="flex items-center">
                          <Activity className="w-4 h-4 mr-1" />
                          Stage: {analysis.stage}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalysisClick(analysis._id);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-cyber-blue/20 hover:bg-cyber-blue/30 text-cyber-blue rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                  </div>

                  {analysis.status === 'IN_PROGRESS' && analysis.progress && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <motion.div
                          className="bg-cyber-blue h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${analysis.progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )}

                  {analysis.error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                      <p className="text-red-400 text-sm">{analysis.error}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AnalysisListPage;