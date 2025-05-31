'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, AlertTriangle, CheckCircle, Brain } from 'lucide-react';
import { SecurityAnalysis } from '@/types';

interface RealTimeAnalysisFeedProps {
  analysis: SecurityAnalysis | null;
}

interface FeedItem {
  id: string;
  type: 'scan' | 'vulnerability' | 'analysis' | 'remediation';
  message: string;
  timestamp: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  file?: string;
  line?: number;
}

const RealTimeAnalysisFeed: React.FC<RealTimeAnalysisFeedProps> = ({ analysis }) => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Simulate real-time feed updates
    const simulateFeed = () => {
      const items: FeedItem[] = [
        {
          id: '1',
          type: 'scan',
          message: 'Scanning authentication.py...',
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'vulnerability',
          message: 'CRITICAL: SQL injection detected at line 47',
          timestamp: new Date(Date.now() + 1000).toISOString(),
          severity: 'CRITICAL',
          file: 'authentication.py',
          line: 47,
        },
        {
          id: '3',
          type: 'analysis',
          message: 'Analyzing attack vectors...',
          timestamp: new Date(Date.now() + 2000).toISOString(),
        },
        {
          id: '4',
          type: 'analysis',
          message: 'Mapping threat model...',
          timestamp: new Date(Date.now() + 3000).toISOString(),
        },
        {
          id: '5',
          type: 'remediation',
          message: 'Generating remediation...',
          timestamp: new Date(Date.now() + 4000).toISOString(),
        },
      ];

      items.forEach((item, index) => {
        setTimeout(() => {
          setFeedItems(prev => [item, ...prev].slice(0, 10));
        }, index * 1500);
      });
    };

    simulateFeed();
    const interval = setInterval(simulateFeed, 15000);

    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'scan':
        return <Search className="w-4 h-4 text-cyber-blue" />;
      case 'vulnerability':
        return <AlertTriangle className="w-4 h-4 text-cyber-red" />;
      case 'analysis':
        return <Brain className="w-4 h-4 text-cyber-orange" />;
      case 'remediation':
        return <CheckCircle className="w-4 h-4 text-cyber-green" />;
      default:
        return <Zap className="w-4 h-4 text-cyber-blue" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-cyber-red';
      case 'HIGH':
        return 'text-red-400';
      case 'MEDIUM':
        return 'text-cyber-orange';
      case 'LOW':
        return 'text-yellow-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Live indicator */}
      <div className="flex items-center space-x-2 text-sm text-gray-400">
        <motion.div
          className="w-2 h-2 bg-cyber-green rounded-full"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span>Live stream of AI findings</span>
      </div>

      {/* Feed items */}
      <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
        <AnimatePresence>
          {feedItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${getSeverityColor(item.severity)}`}>
                    {item.severity && (
                      <span className="mr-2 px-1.5 py-0.5 text-xs bg-gray-700 rounded">
                        {item.severity}
                      </span>
                    )}
                    {item.message}
                  </span>
                </div>

                {item.file && (
                  <div className="text-xs text-gray-400 mb-1">
                    📄 {item.file}{item.line && `:${item.line}`}
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* AI suggestions */}
      {analysis && analysis.vulnerabilities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/30"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">AI Suggests</span>
          </div>
          <p className="text-sm text-gray-300">
            Use parameterized queries with prepared statements to prevent SQL injection attacks.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-2 text-xs text-purple-400 hover:text-purple-300 underline"
          >
            View secure code alternative →
          </motion.button>
        </motion.div>
      )}
    </div>
  );
};

export default RealTimeAnalysisFeed;
