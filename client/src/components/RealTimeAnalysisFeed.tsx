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
  const [feedIdCounter, setFeedIdCounter] = useState(0);

  // Generate unique IDs using timestamp + counter approach
  const generateUniqueId = () => {
    const id = `feed_${Date.now()}_${feedIdCounter}`;
    setFeedIdCounter(prev => prev + 1);
    return id;
  };

  useEffect(() => {
    if (!analysis) return;

    try {
      // Clear any existing feed items when analysis changes
      setFeedItems([]);
      setFeedIdCounter(0);

      // Generate feed items based on actual analysis state
      const generateFeedBasedOnAnalysis = () => {
        const items: FeedItem[] = [];
        const baseTime = Date.now();

        try {
          // Add items based on analysis status and progress
          if (analysis.status === 'PENDING') {
            items.push({
              id: generateUniqueId(),
              type: 'scan',
              message: 'Analysis queued - preparing to scan codebase...',
              timestamp: new Date(baseTime).toISOString(),
            });
          } else if (analysis.status === 'IN_PROGRESS') {
            // Add stage-specific messages
            switch (analysis.stage) {
              case 'INITIALIZING':
                items.push({
                  id: generateUniqueId(),
                  type: 'scan',
                  message: 'Initializing security analysis engine...',
                  timestamp: new Date(baseTime).toISOString(),
                });
                break;
              case 'FETCHING_CODE':
                items.push({
                  id: generateUniqueId(),
                  type: 'scan',
                  message: 'Fetching project files from repository...',
                  timestamp: new Date(baseTime).toISOString(),
                });
                break;
              case 'STATIC_ANALYSIS':
                items.push({
                  id: generateUniqueId(),
                  type: 'analysis',
                  message: 'Performing static code analysis...',
                  timestamp: new Date(baseTime + 500).toISOString(),
                });
                if (analysis.progress && analysis.progress > 30) {
                  items.push({
                    id: generateUniqueId(),
                    type: 'scan',
                    message: `Scanning files... ${analysis.progress}% complete`,
                    timestamp: new Date(baseTime + 1000).toISOString(),
                  });
                }
                break;
              case 'AI_ANALYSIS':
                items.push({
                  id: generateUniqueId(),
                  type: 'analysis',
                  message: 'AI analyzing code patterns and security vulnerabilities...',
                  timestamp: new Date(baseTime + 1500).toISOString(),
                });
                break;
              case 'THREAT_MODELING':
                items.push({
                  id: generateUniqueId(),
                  type: 'analysis',
                  message: 'Generating threat model and attack vectors...',
                  timestamp: new Date(baseTime + 2000).toISOString(),
                });
                break;
            }
          } else if (analysis.status === 'COMPLETED') {
            items.push({
              id: generateUniqueId(),
              type: 'remediation',
              message: `Analysis complete! Found ${analysis.vulnerabilities?.length || 0} vulnerabilities`,
              timestamp: new Date(baseTime).toISOString(),
            });
            
            // Add vulnerability highlights
            const criticalVulns = (analysis.vulnerabilities && Array.isArray(analysis.vulnerabilities)) 
              ? analysis.vulnerabilities.filter(v => v && v.severity === 'CRITICAL') 
              : [];
            if (criticalVulns.length > 0) {
              items.push({
                id: generateUniqueId(),
                type: 'vulnerability',
                message: `${criticalVulns.length} critical vulnerabilities detected`,
                timestamp: new Date(baseTime + 500).toISOString(),
                severity: 'CRITICAL',
              });
            }
          } else if (analysis.status === 'FAILED') {
            items.push({
              id: generateUniqueId(),
              type: 'vulnerability',
              message: 'Analysis failed - please check logs for details',
              timestamp: new Date(baseTime).toISOString(),
              severity: 'HIGH',
            });
          }
        } catch (error) {
          console.warn('Error generating feed items:', error);
        }

        return items;
      };

      // Add initial feed items
      const initialItems = generateFeedBasedOnAnalysis();
      for (let itemIndex = 0; itemIndex < initialItems.length; itemIndex++) {
        const item = initialItems[itemIndex];
        if (!item) continue;
        
        setTimeout(() => {
          setFeedItems(prev => {
            // Ensure no duplicate keys by filtering out any existing items with the same ID
            const filteredPrev = prev.filter(existingItem => existingItem && existingItem.id !== item.id);
            return [item, ...filteredPrev].slice(0, 10);
          });
        }, itemIndex * 800); // Stagger the appearance
      }
    } catch (error) {
      console.warn('Error in RealTimeAnalysisFeed useEffect:', error);
    }
  }, [analysis?.id, analysis?.status, analysis?.stage, analysis?.progress]); // Only re-run when analysis actually changes

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
      {analysis && analysis.vulnerabilities && analysis.vulnerabilities.length > 0 && (
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
