import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { analysisAPI, projectAPI } from '../utils/api';
import { SecurityAnalysis, Project, Vulnerability } from '../types';
import ThreatModelVisualization from './ThreatModelVisualization';
import RealTimeAnalysisFeed from './RealTimeAnalysisFeed';
import { Clock, AlertTriangle, Shield, Activity, FileText, RefreshCw, Play, Settings } from 'lucide-react';

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

      // Navigate to real-time analysis view
      router.push(`/analysis/${projectId}`);
    } catch (error: any) {
      console.error('Failed to start analysis:', error);
      setError('Failed to start analysis');
      setLoading(false);
    }
  };

  const handleViewHistory = () => {
    router.push(`/projects/${projectId}/history`);
  };

  const handleProjectSettings = () => {
    router.push(`/projects/${projectId}/settings`);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVulnerabilityStats = () => {
    if (!analysis?.vulnerabilities) return { critical: 0, high: 0, medium: 0, low: 0 };

    return analysis.vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity.toLowerCase() as keyof typeof acc]++;
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-4 bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <div className="ml-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="m-4 bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <div className="ml-3">
            <p className="text-sm text-red-800">Project not found</p>
          </div>
        </div>
      </div>
    );
  }

  const vulnStats = getVulnerabilityStats();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-600 mt-1">{project.repositoryUrl}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleProjectSettings}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
          <button
            onClick={handleViewHistory}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            History
          </button>
          <button
            onClick={handleRunAnalysis}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Run Analysis
          </button>
        </div>
      </div>

      {/* Analysis Status */}
      {analysis ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Shield className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Security Score</dt>
                      <dd className="text-lg font-medium text-gray-900">{analysis.securityScore}/100</dd>
                    </dl>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${analysis.securityScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Threat Level</dt>
                      <dd>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getThreatLevelColor(analysis.threatLevel)}`}>
                          {analysis.threatLevel}
                        </span>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Vulnerabilities</dt>
                      <dd className="text-lg font-medium text-gray-900">{analysis.vulnerabilities.length}</dd>
                    </dl>
                    <div className="flex gap-1 mt-2">
                      {vulnStats.critical > 0 && <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">{vulnStats.critical} Critical</span>}
                      {vulnStats.high > 0 && <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">{vulnStats.high} High</span>}
                      {vulnStats.medium > 0 && <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">{vulnStats.medium} Medium</span>}
                      {vulnStats.low > 0 && <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">{vulnStats.low} Low</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Last Scan</dt>
                      <dd className="text-sm text-gray-900">{formatTimestamp(analysis.timestamp)}</dd>
                    </dl>
                    <div className="text-xs text-gray-500 mt-1">
                      Commit: {analysis.commitHash.substring(0, 8)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Threat Model Visualization */}
            <div className="bg-white shadow rounded-lg col-span-1 lg:col-span-2">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Threat Model</h3>
                <div className="mt-4 h-96">
                  <ThreatModelVisualization threatModel={analysis.threatModel} />
                </div>
              </div>
            </div>

            {/* Vulnerabilities List */}
            {analysis.vulnerabilities.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Top Vulnerabilities</h3>
                  <div className="mt-4 space-y-3">
                    {analysis.vulnerabilities.slice(0, 5).map((vuln: Vulnerability) => (
                      <div key={vuln.id} className="border-l-4 border-l-red-500 pl-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{vuln.type}</h4>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getThreatLevelColor(vuln.severity)}`}>
                            {vuln.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{vuln.description}</p>
                        <p className="text-xs text-gray-500">{vuln.file}:{vuln.line}</p>
                      </div>
                    ))}
                    {analysis.vulnerabilities.length > 5 && (
                      <button
                        onClick={() => router.push(`/projects/${projectId}/vulnerabilities`)}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        View All {analysis.vulnerabilities.length} Vulnerabilities
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* AI Analysis */}
            {analysis.aiAnalysis && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">AI Security Analysis</h3>
                  <p className="mt-4 text-sm leading-relaxed text-gray-600">{analysis.aiAnalysis}</p>
                </div>
              </div>
            )}
          </div>

          {/* Real-time Analysis Feed */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Analysis Activity</h3>
              <div className="mt-4">
                <RealTimeAnalysisFeed analysis={analysis} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Security Analysis Yet</h3>
            <p className="text-gray-600 mb-6">
              Run your first security analysis to get insights about your project's security posture.
            </p>
            <button
              onClick={handleRunAnalysis}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Run First Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
