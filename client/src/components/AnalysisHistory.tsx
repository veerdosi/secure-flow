import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Calendar } from 'lucide-react';

interface AnalysisHistoryData {
  analyses: number;
  timeRange: string;
  history: Array<{
    timestamp: Date;
    securityScore: number;
    threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    vulnerabilityCount: number;
    newVulnerabilities: number;
    resolvedVulnerabilities: number;
    commitHash: string;
    triggeredBy: 'manual' | 'webhook' | 'scheduled';
  }>;
  summary: { averageScore: number; totalVulnerabilities: number; criticalFindings: number; };
}

export default function AnalysisHistory({ projectId, timeRange = 30 }: { projectId: string; timeRange?: number; }) {
  const [data, setData] = useState<AnalysisHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRange, setSelectedRange] = useState(timeRange);

  useEffect(() => { loadHistory(); }, [projectId, selectedRange]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analysis/project/${projectId}/history?days=${selectedRange}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to load analysis history');
      setData(await response.json());
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-400';
      case 'HIGH': return 'text-orange-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'LOW': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Activity className="w-5 h-5 mr-2 text-cyber-blue" />
            Analysis History
          </h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
          </div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Activity className="w-5 h-5 mr-2 text-cyber-blue" />
            Analysis History
          </h3>
        </div>
        <div className="text-center text-red-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error || 'Failed to load analysis history'}</p>
        </div>
      </>
    );
  }

  const recentHistory = data.history.slice(0, 5);

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Activity className="w-5 h-5 mr-2 text-cyber-blue" />
          Analysis History
        </h3>
        <select
          value={selectedRange}
          onChange={(e) => setSelectedRange(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-xs"
        >
          <option value={7}>7d</option>
          <option value={30}>30d</option>
          <option value={90}>90d</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-center">
            <p className="text-xs text-gray-400">Avg Score</p>
            <p className={`text-lg font-bold ${getScoreColor(data.summary.averageScore)}`}>
              {Math.round(data.summary.averageScore)}
            </p>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-center">
            <p className="text-xs text-gray-400">Total Vulns</p>
            <p className="text-lg font-bold text-yellow-400">{data.summary.totalVulnerabilities}</p>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-center">
            <p className="text-xs text-gray-400">Critical</p>
            <p className="text-lg font-bold text-red-400">{data.summary.criticalFindings}</p>
          </div>
        </div>
      </div>

      {/* Recent Analysis Timeline */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Analyses</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {recentHistory.map((item, index) => (
            <div key={index} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${getThreatColor(item.threatLevel).replace('text-', 'bg-')}`}></span>
                  <span className="text-xs text-gray-400">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
                    {item.triggeredBy}
                  </span>
                </div>
                <span className={`text-sm font-medium ${getScoreColor(item.securityScore)}`}>
                  {item.securityScore}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{item.vulnerabilityCount} vulnerabilities</span>
                <div className="flex space-x-3">
                  {item.newVulnerabilities > 0 && (
                    <span className="text-red-400">+{item.newVulnerabilities} new</span>
                  )}
                  {item.resolvedVulnerabilities > 0 && (
                    <span className="text-green-400">-{item.resolvedVulnerabilities} fixed</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.history.length === 0 && (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No analysis history available</p>
          <p className="text-gray-500 text-xs">Run some analyses to see trends</p>
        </div>
      )}
    </>
  );
}
