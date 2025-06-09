import { Analysis } from '../models';
import gitlabService from './gitlab';
import aiAnalysisService from './aiAnalysis';
import logger from '../utils/logger';

interface RemediationResult {
  actionId: string;
  success: boolean;
  error?: string;
  commitHash?: string;
  mergeRequestId?: string;
}

class RemediationService {
  async generateRemediationActions(vulnerabilities: any[], projectFiles: any[]): Promise<any[]> {
    logger.info(`🛠️ Starting remediation action generation`, {
      vulnerabilities: vulnerabilities.length,
      projectFiles: projectFiles.length,
      severityCounts: vulnerabilities.reduce((acc: any, v) => {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
        return acc;
      }, {})
    });

    const actions = [];
    let processedCount = 0;
    let errorCount = 0;

    for (const vuln of vulnerabilities) {
      try {
        logger.info(`🔧 Generating fix for vulnerability ${processedCount + 1}/${vulnerabilities.length}`, {
          file: vuln.file,
          type: vuln.type,
          severity: vuln.severity,
          line: vuln.line
        });

        const remediationSuggestion = await aiAnalysisService.generateCodeFix(
          vuln.file,
          vuln.code,
          vuln.type,
          vuln.severity
        );

        if (remediationSuggestion) {
          const action = {
            id: `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: this.getRemediationType(vuln.type),
            title: `Fix ${vuln.type} in ${vuln.file}`,
            description: remediationSuggestion.description || `Automated fix for ${vuln.type}`,
            file: vuln.file,
            lineNumber: vuln.line,
            originalCode: vuln.code,
            proposedCode: remediationSuggestion.fixedCode,
            severity: vuln.severity,
            automated: remediationSuggestion.confidence > 80,
            estimatedRisk: this.calculateEstimatedRisk(vuln.severity, remediationSuggestion.confidence),
            confidence: remediationSuggestion.confidence
          };

          actions.push(action);

          logger.info(`✅ Remediation action generated`, {
            actionId: action.id,
            confidence: action.confidence,
            automated: action.automated,
            estimatedRisk: action.estimatedRisk
          });
        } else {
          logger.warn(`⚠️ No remediation suggestion generated for ${vuln.file}:${vuln.line}`);
        }
        
        processedCount++;
      } catch (error) {
        errorCount++;
        logger.error(`❌ Failed to generate remediation for vulnerability in ${vuln.file}`, {
          file: vuln.file,
          type: vuln.type,
          severity: vuln.severity,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info(`🎯 Remediation action generation complete`, {
      totalVulnerabilities: vulnerabilities.length,
      actionsGenerated: actions.length,
      processedCount,
      errorCount,
      automatedActions: actions.filter((a: any) => a.automated).length,
      riskBreakdown: actions.reduce((acc: any, a) => {
        acc[a.estimatedRisk] = (acc[a.estimatedRisk] || 0) + 1;
        return acc;
      }, {})
    });

    return actions;
  }

  async executeRemediations(analysisId: string, approvedActionIds: string[]): Promise<RemediationResult[]> {
    const results: RemediationResult[] = [];

    try {
      const analysis = await Analysis.findById(analysisId);
      if (!analysis) {
        throw new Error('Analysis not found');
      }

      const approvedActions = analysis.proposedRemediations.filter(
        action => approvedActionIds.includes(action.id)
      );

      logger.info(`Executing ${approvedActions.length} approved remediation actions for analysis ${analysisId}`);

      // Group actions by file for efficient processing
      const actionsByFile = this.groupActionsByFile(approvedActions);

      for (const [filePath, fileActions] of Object.entries(actionsByFile)) {
        try {
          const result = await this.applyFileRemediations(
            analysis.projectId,
            analysis.userId,
            filePath,
            fileActions as any[],
            analysis.commitHash
          );
          
          results.push(...result);
        } catch (error) {
          logger.error(`Failed to apply remediations to file ${filePath}:`, error);
          fileActions.forEach((action: any) => {
            results.push({
              actionId: action.id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          });
        }
      }

      // Update analysis status
      await Analysis.findByIdAndUpdate(analysisId, {
        status: 'COMPLETED',
        completedAt: new Date()
      });

    } catch (error) {
      logger.error(`Failed to execute remediations for analysis ${analysisId}:`, error);
      throw error;
    }

    return results;
  }

  private groupActionsByFile(actions: any[]): Record<string, any[]> {
    return actions.reduce((groups: Record<string, any[]>, action: any) => {
      if (!groups[action.file]) {
        groups[action.file] = [];
      }
      groups[action.file].push(action);
      return groups;
    }, {} as Record<string, any[]>);
  }

  private async applyFileRemediations(
    projectId: string,
    userId: string,
    filePath: string,
    actions: any[],
    baseBranch: string
  ): Promise<RemediationResult[]> {
    const results: RemediationResult[] = [];

    try {
      // Get current file content
      const currentContent = await gitlabService.getFileContent(projectId, userId, filePath, baseBranch);
      let modifiedContent = currentContent;

      // Apply all changes to the file content
      const sortedActions = actions.sort((a, b) => (b.lineNumber || 0) - (a.lineNumber || 0));

      for (const action of sortedActions) {
        try {
          modifiedContent = this.applyCodeChange(
            modifiedContent,
            action.originalCode,
            action.proposedCode,
            action.lineNumber
          );
          results.push({ actionId: action.id, success: true });
        } catch (error) {
          results.push({
            actionId: action.id,
            success: false,
            error: error instanceof Error ? error.message : 'Failed to apply change'
          });
        }
      }

      // Create branch and commit
      const branchName = `fix/security-remediation-${Date.now()}`;
      await gitlabService.createBranch(projectId, userId, branchName, baseBranch);

      const commitMessage = `Security remediation: Fix ${actions.length} issue(s) in ${filePath}

Applied automated fixes for:
${actions.map((a: any) => `- ${a.title}`).join('\n')}

Generated by SecureFlow AI`;

      const commitResult = await gitlabService.commitFileChange(
        projectId, userId, filePath, modifiedContent, commitMessage, branchName
      );

      const mergeRequest = await gitlabService.createMergeRequest(
        projectId, userId, branchName, baseBranch,
        `Security Remediation: ${actions.length} fixes in ${filePath}`,
        this.generateMRDescription(actions)
      );

      // Update results with merge request info
      results.forEach(result => {
        if (result.success) {
          result.commitHash = commitResult.id;
          result.mergeRequestId = mergeRequest.iid;
        }
      });

    } catch (error) {
      logger.error(`Failed to apply file remediations for ${filePath}:`, error);
      throw error;
    }

    return results;
  }

  private applyCodeChange(content: string, originalCode: string, proposedCode: string, lineNumber?: number): string {
    if (lineNumber) {
      const lines = content.split('\n');
      if (lineNumber > 0 && lineNumber <= lines.length) {
        lines[lineNumber - 1] = proposedCode;
        return lines.join('\n');
      }
    }
    return content.replace(originalCode, proposedCode);
  }

  private generateMRDescription(actions: any[]): string {
    return `## Security Remediation

This merge request contains automated security fixes generated by SecureFlow AI.

### Changes Applied:
${actions.map((a: any) => `
- **${a.title}**
  - Severity: ${a.severity}
  - Confidence: ${a.confidence}%
  - File: \`${a.file}\`
  - Line: ${a.lineNumber || 'N/A'}
`).join('\n')}

### Review Notes:
- All changes have been approved by a human reviewer
- Each fix has been analyzed for potential impact
- Please review the changes carefully before merging

### Testing:
- [ ] Verify functionality is not broken
- [ ] Run security scans to confirm fixes
- [ ] Check for any unintended side effects`;
  }

  private getRemediationType(vulnerabilityType: string): string {
    const typeMap: Record<string, string> = {
      'sql_injection': 'CODE_FIX',
      'xss': 'CODE_FIX',
      'csrf': 'CODE_FIX',
      'insecure_dependency': 'DEPENDENCY_UPDATE',
      'hardcoded_secret': 'CODE_FIX',
      'insecure_config': 'CONFIG_CHANGE',
      'path_traversal': 'CODE_FIX',
      'command_injection': 'CODE_FIX'
    };
    return typeMap[vulnerabilityType] || 'CODE_FIX';
  }

  private calculateEstimatedRisk(severity: string, confidence: number): string {
    if (confidence < 60) return 'HIGH';
    if (severity === 'CRITICAL' || severity === 'HIGH') return 'MEDIUM';
    return 'LOW';
  }
}

export default new RemediationService();
