import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analysisAPI, projectAPI } from '../services/api';
import { SecurityAnalysis, Project, Vulnerability } from '../types';
import ThreatModelVisualization from './ThreatModelVisualization';
import RealTimeAnalysisFeed from './RealTimeAnalysisFeed';
import { Progress } from '../components/ui/progress';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Clock, AlertTriangle, Shield, Activity, FileText, RefreshCw, Play, Settings } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<SecurityAnalysis | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
      fetchLatestAnalysis();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const projectData = await projectAPI.getById(projectId!);
      setProject(projectData);
    } catch (error: any) {
      console.error('Failed to fetch project:', error);
      setError('Failed to load project data');
    }
  };

  const fetchLatestAnalysis = async () => {
    try {
      const analyses = await analysisAPI.getByProject(projectId!, 1);

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

        // Store state for ThreatModelVisualization
        const threatModelState = {
          selectedNode: null,
          selectedEdge: null,
          cameraPosition: { x: 0, y: 0, z: 5 },
          zoomLevel: 1
        };
        localStorage.setItem('threatModelState', JSON.stringify(threatModelState));
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
      await analysisAPI.startAnalysis(projectId);

      // Navigate to real-time analysis view
      navigate(`/analysis/${projectId}`);
    } catch (error: any) {
      console.error('Failed to start analysis:', error);
      setError('Failed to start analysis');
      setLoading(false);
    }
  };

  const handleViewHistory = () => {
    navigate(`/projects/${projectId}/history`);
  };

  const handleProjectSettings = () => {
    navigate(`/projects/${projectId}/settings`);
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
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!project) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Project not found</AlertDescription>
      </Alert>
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
          <Button onClick={handleProjectSettings} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={handleViewHistory} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            History
          </Button>
          <Button onClick={handleRunAnalysis} className="bg-blue-600 hover:bg-blue-700">
            <Play className="h-4 w-4 mr-2" />
            Run Analysis
          </Button>
        </div>
      </div>

      {/* Analysis Status */}
      {analysis ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Score</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysis.securityScore}/100</div>
                <Progress value={analysis.securityScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Threat Level</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge className={getThreatLevelColor(analysis.threatLevel)}>
                  {analysis.threatLevel}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vulnerabilities</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysis.vulnerabilities.length}</div>
                <div className="flex gap-2 mt-2">
                  {vulnStats.critical > 0 && <Badge className="bg-red-100 text-red-800">{vulnStats.critical} Critical</Badge>}
                  {vulnStats.high > 0 && <Badge className="bg-orange-100 text-orange-800">{vulnStats.high} High</Badge>}
                  {vulnStats.medium > 0 && <Badge className="bg-yellow-100 text-yellow-800">{vulnStats.medium} Medium</Badge>}
                  {vulnStats.low > 0 && <Badge className="bg-green-100 text-green-800">{vulnStats.low} Low</Badge>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Scan</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm">{formatTimestamp(analysis.timestamp)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Commit: {analysis.commitHash.substring(0, 8)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Threat Model Visualization */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle>Threat Model</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ThreatModelVisualization analysis={analysis} />
                </div>
              </CardContent>
            </Card>

            {/* Vulnerabilities List */}
            {analysis.vulnerabilities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Vulnerabilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.vulnerabilities.slice(0, 5).map((vuln: Vulnerability) => (
                      <div key={vuln.id} className="border-l-4 border-l-red-500 pl-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{vuln.type}</h4>
                          <Badge className={getThreatLevelColor(vuln.severity)}>
                            {vuln.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{vuln.description}</p>
                        <p className="text-xs text-gray-500">{vuln.file}:{vuln.line}</p>
                      </div>
                    ))}
                    {analysis.vulnerabilities.length > 5 && (
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/projects/${projectId}/vulnerabilities`)}
                        className="w-full"
                      >
                        View All {analysis.vulnerabilities.length} Vulnerabilities
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Analysis */}
            {analysis.aiAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Security Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{analysis.aiAnalysis}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Real-time Analysis Feed */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <RealTimeAnalysisFeed projectId={projectId!} analysisId={analysis.id} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Security Analysis Yet</h3>
            <p className="text-gray-600 mb-6">
              Run your first security analysis to get insights about your project's security posture.
            </p>
            <Button onClick={handleRunAnalysis} className="bg-blue-600 hover:bg-blue-700">
              <Play className="h-4 w-4 mr-2" />
              Run First Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
