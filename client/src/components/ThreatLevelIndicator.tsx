'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, AlertCircle, XCircle } from 'lucide-react';

interface ThreatLevelIndicatorProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilityCount: number;
}

const ThreatLevelIndicator: React.FC<ThreatLevelIndicatorProps> = ({
  level,
  vulnerabilityCount
}) => {
  const getConfig = (level: string) => {
    switch (level) {
      case 'LOW':
        return {
          color: '#39ff14',
          bgColor: 'rgba(57, 255, 20, 0.1)',
          icon: Shield,
          pulse: false
        };
      case 'MEDIUM':
        return {
          color: '#ff6b35',
          bgColor: 'rgba(255, 107, 53, 0.1)',
          icon: AlertTriangle,
          pulse: true
        };
      case 'HIGH':
        return {
          color: '#ff073a',
          bgColor: 'rgba(255, 7, 58, 0.1)',
          icon: AlertCircle,
          pulse: true
        };
      case 'CRITICAL':
        return {
          color: '#ff073a',
          bgColor: 'rgba(255, 7, 58, 0.2)',
          icon: XCircle,
          pulse: true
        };
      default:
        return {
          color: '#39ff14',
          bgColor: 'rgba(57, 255, 20, 0.1)',
          icon: Shield,
          pulse: false
        };
    }
  };

  const config = getConfig(level);
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* Threat Level Display */}
      <motion.div
        className="flex items-center justify-center p-6 rounded-lg border"
        style={{
          backgroundColor: config.bgColor,
          borderColor: config.color + '40',
        }}
        animate={config.pulse ? {
          boxShadow: [
            `0 0 0 0 ${config.color}40`,
            `0 0 0 10px ${config.color}00`,
            `0 0 0 0 ${config.color}40`,
          ]
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <motion.div
          className="flex flex-col items-center space-y-2"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Icon
            className="w-8 h-8"
            style={{ color: config.color }}
          />
          <span
            className="text-xl font-bold"
            style={{ color: config.color }}
          >
            {level}
          </span>
        </motion.div>
      </motion.div>

      {/* Vulnerability Count */}
      <motion.div
        className="bg-gray-800 rounded-lg p-4 border border-gray-700"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">High Risk Issues</span>
          <motion.span
            className="text-lg font-bold"
            style={{ color: config.color }}
            animate={vulnerabilityCount > 0 && config.pulse ? {
              scale: [1, 1.1, 1],
            } : {}}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          >
            {vulnerabilityCount}
          </motion.span>
        </div>

        {vulnerabilityCount > 0 && (
          <motion.div
            className="mt-2 text-xs text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Immediate attention required
          </motion.div>
        )}
      </motion.div>

      {/* Risk Meter */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Risk Level</span>
          <span>{level}</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <motion.div
            className="h-2 rounded-full"
            style={{ backgroundColor: config.color }}
            initial={{ width: 0 }}
            animate={{
              width: level === 'LOW' ? '25%' :
                     level === 'MEDIUM' ? '50%' :
                     level === 'HIGH' ? '75%' : '100%'
            }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
};

export default ThreatLevelIndicator;
