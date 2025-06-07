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
      </div>
    </motion.div>
  );
}
