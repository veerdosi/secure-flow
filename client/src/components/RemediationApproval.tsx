import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Eye, Code, FileText, Clock, User, MessageSquare } from 'lucide-react';

interface RemediationAction {
  id: string;
  type: 'CODE_FIX' | 'DEPENDENCY_UPDATE' | 'CONFIG_CHANGE' | 'SECURITY_PATCH';
  title: string;
  description: string;
  file: string;
  lineNumber?: number;
  originalCode?: string;
  proposedCode?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  automated: boolean;
  estimatedRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
}

interface HumanApproval {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  approvedActions: string[];
  rejectedActions: string[];
  comments?: string;
}

interface RemediationApprovalProps {
  analysisId: string;
  proposedRemediations: RemediationAction[];
  humanApproval: HumanApproval;
  onApprovalUpdate: () => void;
}

export default function RemediationApproval({ analysisId, proposedRemediations, humanApproval, onApprovalUpdate }: RemediationApprovalProps) {
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [showDiff, setShowDiff] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-400 bg-red-500/10 border-red-500/50';
      case 'HIGH': return 'text-orange-400 bg-orange-500/10 border-orange-500/50';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/50';
      case 'LOW': return 'text-green-400 bg-green-500/10 border-green-500/50';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/50';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'HIGH': return 'text-red-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'LOW': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const handleApproval = async (action: 'APPROVE' | 'REJECT' | 'PARTIAL') => {
    try {
      setLoading(true);
      
      const payload: any = { action, comments };
      
      if (action === 'APPROVE') {
        payload.approvedActions = proposedRemediations.map(r => r.id);
      } else if (action === 'REJECT') {
        payload.rejectedActions = proposedRemediations.map(r => r.id);
      } else if (action === 'PARTIAL') {
        payload.approvedActions = Array.from(selectedActions);
        payload.rejectedActions = proposedRemediations.filter(r => !selectedActions.has(r.id)).map(r => r.id);
      }

      const response = await fetch(`/api/approval/${analysisId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to process approval');
      }

      onApprovalUpdate();
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActionSelection = (actionId: string) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(actionId)) {
      newSelected.delete(actionId);
    } else {
      newSelected.add(actionId);
    }
    setSelectedActions(newSelected);
  };

  if (humanApproval.status !== 'PENDING') {
    return (
      <div className="bg-dark-card border border-dark-border rounded-xl p-6">
        <div className="text-center">
          {humanApproval.status === 'APPROVED' ? (
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          )}
          <h3 className="text-xl font-semibold mb-2">
            Remediation {humanApproval.status}
          </h3>
          <p className="text-gray-400 mb-4">
            {humanApproval.status === 'APPROVED' 
              ? 'Remediation actions have been approved and are being applied.'
              : 'Remediation actions have been rejected.'
            }
          </p>
          {humanApproval.comments && (
            <div className="bg-gray-800 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-300">{humanApproval.comments}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-dark-card border border-dark-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
          Remediation Approval Required
        </h3>
        <div className="flex items-center text-sm text-gray-400">
          <Clock className="w-4 h-4 mr-1" />
          {proposedRemediations.length} actions pending
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {proposedRemediations.map((action) => (
          <div key={action.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-medium">{action.title}</h4>
                  <span className={`px-2 py-1 text-xs rounded border ${getSeverityColor(action.severity)}`}>
                    {action.severity}
                  </span>
                  <span className={`text-xs ${getRiskColor(action.estimatedRisk)}`}>
                    {action.estimatedRisk} Risk
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-2">{action.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center">
                    <FileText className="w-3 h-3 mr-1" />
                    {action.file}
                  </span>
                  {action.lineNumber && <span>Line {action.lineNumber}</span>}
                  <span>Confidence: {action.confidence}%</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedActions.has(action.id)}
                    onChange={() => toggleActionSelection(action.id)}
                    className="mr-2 text-cyber-blue focus:ring-cyber-blue"
                  />
                  <span className="text-sm">Select</span>
                </label>
                <button
                  onClick={() => setShowDiff(showDiff === action.id ? null : action.id)}
                  className="text-cyber-blue hover:text-blue-400 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {showDiff === action.id && action.originalCode && action.proposedCode && (
              <div className="mt-4 border-t border-gray-700 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-red-400 mb-2">Before:</h5>
                    <pre className="bg-gray-900 p-3 rounded text-xs overflow-x-auto">
                      <code className="text-red-300">{action.originalCode}</code>
                    </pre>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-green-400 mb-2">After:</h5>
                    <pre className="bg-gray-900 p-3 rounded text-xs overflow-x-auto">
                      <code className="text-green-300">{action.proposedCode}</code>
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Comments (optional)
        </label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white resize-none"
          rows={3}
          placeholder="Add any comments about your decision..."
        />
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={() => handleApproval('REJECT')}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Reject All
        </button>
        <button
          onClick={() => handleApproval('PARTIAL')}
          disabled={loading || selectedActions.size === 0}
          className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center"
        >
          <Eye className="w-4 h-4 mr-2" />
          Approve Selected ({selectedActions.size})
        </button>
        <button
          onClick={() => handleApproval('APPROVE')}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Approve All
        </button>
      </div>
    </motion.div>
  );
}
