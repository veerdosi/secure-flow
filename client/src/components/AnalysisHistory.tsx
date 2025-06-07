import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

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

  if (loading) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-xl p-6">
        <div className="text-center text-red-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error || 'Failed to load analysis history'}</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.history.map(item => new Date(item.timestamp)),
    datasets: [
      {
        label: 'Security Score',
        data: data.history.map(item => item.securityScore),
        borderColor: '#00D2FF',
        backgroundColor: 'rgba(0, 210, 255, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Vulnerabilities',
        data: data.history.map(item => item.vulnerabilityCount),
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    interaction: { intersect: false, mode: 'index' as const },
    plugins: {
      legend: { labels: { color: '#E5E7EB' } },
      tooltip: { backgroundColor: '#1F2937', titleColor: '#E5E7EB', bodyColor: '#E5E7EB' }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: { displayFormats: { day: 'MMM dd' } },
        grid: { color: '#374151' },
        ticks: { color: '#9CA3AF' }
      },
      y: {
        position: 'left' as const,
        grid: { color: '#374151' },
        ticks: { color: '#9CA3AF' },
        title: { display: true, text: 'Security Score', color: '#9CA3AF' }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: { color: '#9CA3AF' },
        title: { display: true, text: 'Vulnerabilities', color: '#9CA3AF' }
      }
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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-dark-card border border-dark-border rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold flex items-center">
          <Activity className="w-5 h-5 mr-2 text-cyber-blue" />
          Analysis History
        </h3>
        <select
          value={selectedRange}
          onChange={(e) => setSelectedRange(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Average Score</p>
              <p className="text-2xl font-bold">{Math.round(data.summary.averageScore)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Vulnerabilities</p>
              <p className="text-2xl font-bold">{data.summary.totalVulnerabilities}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Critical Findings</p>
              <p className="text-2xl font-bold">{data.summary.criticalFindings}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      <div className="h-64">
        <Line data={chartData} options={chartOptions} />
      </div>
    </motion.div>
  );
}
