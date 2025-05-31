'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SecurityScoreRingProps {
  score: number;
  size?: number;
}

const SecurityScoreRing: React.FC<SecurityScoreRingProps> = ({ score, size = 120 }) => {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#39ff14'; // cyber-green
    if (score >= 60) return '#ff6b35'; // cyber-orange
    return '#ff073a'; // cyber-red
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="8"
          fill="transparent"
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getScoreColor(score)}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 2, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 8px ${getScoreColor(score)}40)`,
          }}
        />
      </svg>

      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold"
          style={{ color: getScoreColor(score) }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-sm text-gray-400">/100</span>
      </div>

      {/* Animated particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyber-blue rounded-full"
            style={{
              left: `${50 + 30 * Math.cos((i * 120 * Math.PI) / 180)}%`,
              top: `${50 + 30 * Math.sin((i * 120 * Math.PI) / 180)}%`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SecurityScoreRing;
