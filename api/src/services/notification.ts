import nodemailer from 'nodemailer';
import axios from 'axios';
import { Project, User } from '../models';
import logger from '../utils/logger';

interface NotificationData {
  projectId: string;
  projectName: string;
  analysisId: string;
  commitHash: string;
  commitMessage?: string;
  author?: {
    name: string;
    email: string;
  };
  securityScore: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilityCount: number;
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
  repositoryUrl?: string;
  dashboardUrl?: string;
}

class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter() {
    if (!process.env.SMTP_HOST) {
      logger.warn('SMTP configuration not found. Email notifications will be disabled.');
      return;
    }

    try {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Verify connection
      this.emailTransporter.verify((error) => {
        if (error) {
          logger.error('SMTP connection failed:', error);
          this.emailTransporter = null;
        } else {
          logger.info('✅ SMTP connection established');
        }
      });
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      this.emailTransporter = null;
    }
  }

  async sendAnalysisNotifications(data: NotificationData): Promise<void> {
    try {
      const project = await Project.findById(data.projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const settings = project.notificationSettings;
      if (!settings) {
        logger.info(`No notification settings configured for project ${data.projectId}`);
        return;
      }

      // Check if we should send notifications based on severity threshold
      const severityLevels = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
      const minSeverityLevel = severityLevels[settings.minSeverity];
      const currentThreatLevel = severityLevels[data.threatLevel];

      if (currentThreatLevel < minSeverityLevel) {
        logger.info(`Threat level ${data.threatLevel} below minimum ${settings.minSeverity}, skipping notifications`);
        return;
      }

      const promises: Promise<void>[] = [];

      // Send email notifications
      if (settings.email && settings.emailAddresses?.length > 0) {
        promises.push(this.sendEmailNotification(data, settings.emailAddresses));
      }

      // Send Slack notifications
      if (settings.slack && settings.slackChannel) {
        promises.push(this.sendSlackNotification(data, settings.slackChannel));
      }

      // Send webhook notifications
      if (settings.webhook && settings.webhookUrl) {
        promises.push(this.sendWebhookNotification(data, settings.webhookUrl));
      }

      await Promise.allSettled(promises);
      logger.info(`Notifications sent for analysis ${data.analysisId}`);
    } catch (error) {
      logger.error('Failed to send analysis notifications:', error);
    }
  }

  private async sendEmailNotification(data: NotificationData, emailAddresses: string[]): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not initialized');
    }

    try {
      const subject = this.getEmailSubject(data);
      const htmlContent = this.generateEmailHTML(data);
      const textContent = this.generateEmailText(data);

      const mailOptions = {
        from: process.env.SMTP_FROM || 'SecureFlow AI <noreply@secureflow.ai>',
        to: emailAddresses.join(', '),
        subject,
        text: textContent,
        html: htmlContent,
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Email notification sent to: ${emailAddresses.join(', ')}`);
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      throw error;
    }
  }

  private getEmailSubject(data: NotificationData): string {
    const emoji = this.getThreatEmoji(data.threatLevel);
    const action = data.vulnerabilityCount > 0 ? 'Security Issues Detected' : 'Analysis Complete';
    
    return `${emoji} SecureFlow AI: ${action} - ${data.projectName} (Score: ${data.securityScore}/100)`;
  }

  private getThreatEmoji(threatLevel: string): string {
    switch (threatLevel) {
      case 'CRITICAL': return '🚨';
      case 'HIGH': return '⚠️';
      case 'MEDIUM': return '⚡';
      case 'LOW': return '✅';
      default: return '🔍';
    }
  }

  private generateEmailHTML(data: NotificationData): string {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const dashboardUrl = `${baseUrl}/dashboard?project=${data.projectId}`;
    const analysisUrl = `${baseUrl}/analysis/${data.analysisId}`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SecureFlow AI - Security Analysis Report</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #00d4ff 0%, #39ff14 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .score-card { background-color: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
            .score-number { font-size: 48px; font-weight: bold; color: ${this.getScoreColor(data.securityScore)}; }
            .threat-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; background-color: ${this.getThreatColor(data.threatLevel)}; }
            .vulnerability-list { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 15px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #00d4ff 0%, #39ff14 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
            .commit-info { background-color: #e9ecef; border-radius: 6px; padding: 15px; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🛡️ SecureFlow AI</h1>
                <h2>Security Analysis Report</h2>
                <p>${data.projectName}</p>
            </div>
            
            <div class="content">
                <div class="score-card">
                    <div class="score-number">${data.securityScore}/100</div>
                    <p>Security Score</p>
                    <span class="threat-badge">${data.threatLevel} RISK</span>
                </div>

                ${data.commitHash ? `
                <div class="commit-info">
                    <h3>📝 Commit Information</h3>
                    <p><strong>Hash:</strong> ${data.commitHash.substring(0, 8)}</p>
                    ${data.commitMessage ? `<p><strong>Message:</strong> ${data.commitMessage}</p>` : ''}
                    ${data.author ? `<p><strong>Author:</strong> ${data.author.name} (${data.author.email})</p>` : ''}
                </div>
                ` : ''}

                ${data.vulnerabilityCount > 0 ? `
                <div class="vulnerability-list">
                    <h3>⚠️ Security Issues Found</h3>
                    <ul>
                        ${data.criticalCount ? `<li><strong>${data.criticalCount} Critical</strong> vulnerabilities</li>` : ''}
                        ${data.highCount ? `<li><strong>${data.highCount} High</strong> severity issues</li>` : ''}
                        ${data.mediumCount ? `<li><strong>${data.mediumCount} Medium</strong> severity issues</li>` : ''}
                        ${data.lowCount ? `<li><strong>${data.lowCount} Low</strong> severity issues</li>` : ''}
                    </ul>
                    <p><strong>Total: ${data.vulnerabilityCount} issues detected</strong></p>
                </div>
                ` : `
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <h3>✅ No Security Issues Found</h3>
                    <p>Great job! No security vulnerabilities were detected in this analysis.</p>
                </div>
                `}

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${analysisUrl}" class="cta-button">View Full Analysis</a>
                    <a href="${dashboardUrl}" class="cta-button">Go to Dashboard</a>
                </div>

                <p>This analysis was automatically triggered by a code push to your repository. 
                   Review the detailed findings and implement the suggested security improvements.</p>
            </div>

            <div class="footer">
                <p>SecureFlow AI - Automated Security Analysis</p>
                <p>🔒 Keeping your code secure, one commit at a time</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateEmailText(data: NotificationData): string {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const dashboardUrl = `${baseUrl}/dashboard?project=${data.projectId}`;

    return `
SecureFlow AI - Security Analysis Report

Project: ${data.projectName}
Security Score: ${data.securityScore}/100
Threat Level: ${data.threatLevel}

${data.commitHash ? `
Commit: ${data.commitHash.substring(0, 8)}
${data.commitMessage ? `Message: ${data.commitMessage}` : ''}
${data.author ? `Author: ${data.author.name} (${data.author.email})` : ''}
` : ''}

${data.vulnerabilityCount > 0 ? `
Security Issues Found:
${data.criticalCount ? `- ${data.criticalCount} Critical vulnerabilities` : ''}
${data.highCount ? `- ${data.highCount} High severity issues` : ''}
${data.mediumCount ? `- ${data.mediumCount} Medium severity issues` : ''}
${data.lowCount ? `- ${data.lowCount} Low severity issues` : ''}

Total: ${data.vulnerabilityCount} issues detected
` : 'No security issues found. Great job!'}

View full analysis: ${dashboardUrl}

--
SecureFlow AI - Automated Security Analysis
Keeping your code secure, one commit at a time.
    `;
  }

  private getScoreColor(score: number): string {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#ffc107';
    if (score >= 40) return '#fd7e14';
    return '#dc3545';
  }

  private getThreatColor(threatLevel: string): string {
    switch (threatLevel) {
      case 'CRITICAL': return '#dc3545';
      case 'HIGH': return '#fd7e14';
      case 'MEDIUM': return '#ffc107';
      case 'LOW': return '#28a745';
      default: return '#6c757d';
    }
  }

  private async sendSlackNotification(data: NotificationData, slackChannel: string): Promise<void> {
    try {
      if (!process.env.SLACK_WEBHOOK_URL && !process.env.SLACK_BOT_TOKEN) {
        throw new Error('Slack configuration not found');
      }

      const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const dashboardUrl = `${baseUrl}/dashboard?project=${data.projectId}`;
      
      const color = this.getSlackColor(data.threatLevel);
      const emoji = this.getThreatEmoji(data.threatLevel);

      const slackMessage = {
        channel: slackChannel,
        attachments: [
          {
            color,
            title: `${emoji} Security Analysis Complete - ${data.projectName}`,
            fields: [
              {
                title: 'Security Score',
                value: `${data.securityScore}/100`,
                short: true
              },
              {
                title: 'Threat Level',
                value: data.threatLevel,
                short: true
              },
              {
                title: 'Vulnerabilities',
                value: data.vulnerabilityCount.toString(),
                short: true
              },
              {
                title: 'Commit',
                value: data.commitHash ? data.commitHash.substring(0, 8) : 'N/A',
                short: true
              }
            ],
            actions: [
              {
                type: 'button',
                text: 'View Analysis',
                url: dashboardUrl
              }
            ],
            footer: 'SecureFlow AI',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      if (process.env.SLACK_WEBHOOK_URL) {
        await axios.post(process.env.SLACK_WEBHOOK_URL, slackMessage);
      } else if (process.env.SLACK_BOT_TOKEN) {
        await axios.post('https://slack.com/api/chat.postMessage', slackMessage, {
          headers: {
            'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });
      }

      logger.info(`Slack notification sent to channel: ${slackChannel}`);
    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
      throw error;
    }
  }

  private getSlackColor(threatLevel: string): string {
    switch (threatLevel) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'good';
      default: return '#36a64f';
    }
  }

  private async sendWebhookNotification(data: NotificationData, webhookUrl: string): Promise<void> {
    try {
      const payload = {
        event: 'analysis_complete',
        timestamp: new Date().toISOString(),
        project: {
          id: data.projectId,
          name: data.projectName,
          repository_url: data.repositoryUrl,
        },
        analysis: {
          id: data.analysisId,
          commit_hash: data.commitHash,
          commit_message: data.commitMessage,
          author: data.author,
          security_score: data.securityScore,
          threat_level: data.threatLevel,
          vulnerability_count: data.vulnerabilityCount,
          vulnerabilities_by_severity: {
            critical: data.criticalCount || 0,
            high: data.highCount || 0,
            medium: data.mediumCount || 0,
            low: data.lowCount || 0,
          },
        },
        dashboard_url: data.dashboardUrl,
      };

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SecureFlow-AI/1.0',
        },
        timeout: 10000,
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info(`Webhook notification sent successfully to: ${webhookUrl}`);
      } else {
        throw new Error(`Webhook returned status: ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send webhook notification:', error);
      throw error;
    }
  }

  async sendTestNotification(projectId: string, notificationType: 'email' | 'slack' | 'webhook'): Promise<void> {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const testData: NotificationData = {
        projectId: project._id.toString(),
        projectName: project.name,
        analysisId: 'test-analysis-id',
        commitHash: 'test123456',
        commitMessage: 'Test commit for notification',
        author: {
          name: 'Test User',
          email: 'test@example.com',
        },
        securityScore: 85,
        threatLevel: 'MEDIUM',
        vulnerabilityCount: 3,
        criticalCount: 0,
        highCount: 1,
        mediumCount: 2,
        lowCount: 0,
        repositoryUrl: project.repositoryUrl,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard?project=${projectId}`,
      };

      const settings = project.notificationSettings;
      if (!settings) {
        throw new Error('No notification settings configured');
      }

      switch (notificationType) {
        case 'email':
          if (!settings.email || !settings.emailAddresses?.length) {
            throw new Error('Email notifications not configured');
          }
          await this.sendEmailNotification(testData, settings.emailAddresses);
          break;

        case 'slack':
          if (!settings.slack || !settings.slackChannel) {
            throw new Error('Slack notifications not configured');
          }
          await this.sendSlackNotification(testData, settings.slackChannel);
          break;

        case 'webhook':
          if (!settings.webhook || !settings.webhookUrl) {
            throw new Error('Webhook notifications not configured');
          }
          await this.sendWebhookNotification(testData, settings.webhookUrl);
          break;

        default:
          throw new Error('Invalid notification type');
      }

      logger.info(`Test ${notificationType} notification sent for project ${projectId}`);
    } catch (error) {
      logger.error(`Failed to send test ${notificationType} notification:`, error);
      throw error;
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    if (!this.emailTransporter) {
      logger.warn('Email transporter not available for welcome email');
      return;
    }

    try {
      const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to SecureFlow AI</title>
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #00d4ff 0%, #39ff14 100%); color: white; padding: 40px; text-align: center; }
              .content { padding: 40px; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #00d4ff 0%, #39ff14 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .feature-list { list-style: none; padding: 0; }
              .feature-list li { padding: 10px 0; border-bottom: 1px solid #eee; }
              .feature-list li:before { content: "✅ "; color: #28a745; font-weight: bold; }
              .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🛡️ Welcome to SecureFlow AI!</h1>
                  <p>Your AI-powered security analysis platform</p>
              </div>
              
              <div class="content">
                  <h2>Hi ${userName}! 👋</h2>
                  
                  <p>Welcome to SecureFlow AI! You're now part of a community of developers who prioritize security in their code.</p>
                  
                  <h3>What you can do with SecureFlow AI:</h3>
                  <ul class="feature-list">
                      <li>Real-time security analysis on every code push</li>
                      <li>AI-powered vulnerability detection and remediation</li>
                      <li>Interactive 3D threat model visualizations</li>
                      <li>GitLab integration with automated webhooks</li>
                      <li>Compliance tracking (OWASP, PCI DSS, SOX, GDPR)</li>
                      <li>Smart notifications and reporting</li>
                  </ul>
                  
                  <h3>Getting Started:</h3>
                  <ol>
                      <li><strong>Configure GitLab:</strong> Connect your GitLab account in settings</li>
                      <li><strong>Add Projects:</strong> Import your repositories for monitoring</li>
                      <li><strong>Set up Webhooks:</strong> Enable real-time analysis on code pushes</li>
                      <li><strong>Review Results:</strong> Explore your security dashboard and insights</li>
                  </ol>
                  
                  <div style="text-align: center;">
                      <a href="${baseUrl}/dashboard" class="cta-button">Go to Dashboard</a>
                  </div>
                  
                  <p>Need help? Check out our documentation or reach out to our support team. We're here to help you secure your code!</p>
              </div>

              <div class="footer">
                  <p>SecureFlow AI - AI-Powered Security Analysis</p>
                  <p>🔒 Keeping your code secure, one commit at a time</p>
              </div>
          </div>
      </body>
      </html>
      `;

      const textContent = `
Welcome to SecureFlow AI!

Hi ${userName}!

Welcome to SecureFlow AI! You're now part of a community of developers who prioritize security in their code.

What you can do with SecureFlow AI:
- Real-time security analysis on every code push
- AI-powered vulnerability detection and remediation
- Interactive 3D threat model visualizations
- GitLab integration with automated webhooks
- Compliance tracking (OWASP, PCI DSS, SOX, GDPR)
- Smart notifications and reporting

Getting Started:
1. Configure GitLab: Connect your GitLab account in settings
2. Add Projects: Import your repositories for monitoring
3. Set up Webhooks: Enable real-time analysis on code pushes
4. Review Results: Explore your security dashboard and insights

Get started: ${baseUrl}/dashboard

Need help? Check out our documentation or reach out to our support team. We're here to help you secure your code!

--
SecureFlow AI - AI-Powered Security Analysis
Keeping your code secure, one commit at a time.
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'SecureFlow AI <welcome@secureflow.ai>',
        to: userEmail,
        subject: '🛡️ Welcome to SecureFlow AI - Let\'s Secure Your Code!',
        text: textContent,
        html: htmlContent,
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to: ${userEmail}`);
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
    }
  }

  async sendProjectInviteEmail(inviterName: string, projectName: string, inviteeEmail: string, inviteLink: string): Promise<void> {
    if (!this.emailTransporter) {
      logger.warn('Email transporter not available for project invite');
      return;
    }

    try {
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Invitation - SecureFlow AI</title>
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #00d4ff 0%, #39ff14 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #00d4ff 0%, #39ff14 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .project-card { background-color: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
              .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🛡️ SecureFlow AI</h1>
                  <h2>Project Collaboration Invite</h2>
              </div>
              
              <div class="content">
                  <h2>You've been invited to collaborate! 🎉</h2>
                  
                  <p><strong>${inviterName}</strong> has invited you to collaborate on a security analysis project.</p>
                  
                  <div class="project-card">
                      <h3>📁 ${projectName}</h3>
                      <p>Join this project to access security insights, vulnerability reports, and real-time analysis results.</p>
                  </div>
                  
                  <p>As a collaborator, you'll be able to:</p>
                  <ul>
                      <li>View security analysis results</li>
                      <li>Access vulnerability reports</li>
                      <li>Receive notifications about security findings</li>
                      <li>Contribute to security improvements</li>
                  </ul>
                  
                  <div style="text-align: center;">
                      <a href="${inviteLink}" class="cta-button">Accept Invitation</a>
                  </div>
                  
                  <p><small>This invitation link will expire in 7 days. If you don't have a SecureFlow AI account, you'll be prompted to create one.</small></p>
              </div>

              <div class="footer">
                  <p>SecureFlow AI - AI-Powered Security Analysis</p>
                  <p>🔒 Collaborative security for better code</p>
              </div>
          </div>
      </body>
      </html>
      `;

      const textContent = `
You've been invited to collaborate on SecureFlow AI!

${inviterName} has invited you to collaborate on the "${projectName}" security analysis project.

As a collaborator, you'll be able to:
- View security analysis results
- Access vulnerability reports
- Receive notifications about security findings
- Contribute to security improvements

Accept invitation: ${inviteLink}

This invitation link will expire in 7 days. If you don't have a SecureFlow AI account, you'll be prompted to create one.

--
SecureFlow AI - AI-Powered Security Analysis
Collaborative security for better code.
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'SecureFlow AI <invites@secureflow.ai>',
        to: inviteeEmail,
        subject: `🛡️ ${inviterName} invited you to collaborate on "${projectName}" - SecureFlow AI`,
        text: textContent,
        html: htmlContent,
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Project invite email sent to: ${inviteeEmail}`);
    } catch (error) {
      logger.error('Failed to send project invite email:', error);
    }
  }

  async sendDigestEmail(userEmail: string, userName: string, digestData: any): Promise<void> {
    if (!this.emailTransporter) {
      logger.warn('Email transporter not available for digest email');
      return;
    }

    try {
      const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Weekly Security Digest - SecureFlow AI</title>
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #00d4ff 0%, #39ff14 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; }
              .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
              .stat-card { background-color: #f8f9fa; border-radius: 8px; padding: 15px; text-align: center; }
              .stat-number { font-size: 24px; font-weight: bold; color: #00d4ff; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #00d4ff 0%, #39ff14 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🛡️ SecureFlow AI</h1>
                  <h2>Weekly Security Digest</h2>
                  <p>Your security insights summary</p>
              </div>
              
              <div class="content">
                  <h2>Hi ${userName}! 📊</h2>
                  
                  <p>Here's your weekly security summary for the past 7 days:</p>
                  
                  <div class="stats-grid">
                      <div class="stat-card">
                          <div class="stat-number">${digestData.totalAnalyses || 0}</div>
                          <div>Analyses Run</div>
                      </div>
                      <div class="stat-card">
                          <div class="stat-number">${digestData.vulnerabilitiesFound || 0}</div>
                          <div>Issues Found</div>
                      </div>
                      <div class="stat-card">
                          <div class="stat-number">${digestData.averageScore || 0}</div>
                          <div>Avg Score</div>
                      </div>
                      <div class="stat-card">
                          <div class="stat-number">${digestData.projectsScanned || 0}</div>
                          <div>Projects Scanned</div>
                      </div>
                  </div>
                  
                  ${digestData.topFindings?.length ? `
                  <h3>🔍 Top Security Findings</h3>
                  <ul>
                      ${digestData.topFindings.map((finding: any) => `
                          <li><strong>${finding.type}:</strong> ${finding.description} (${finding.severity})</li>
                      `).join('')}
                  </ul>
                  ` : ''}
                  
                  <div style="text-align: center;">
                      <a href="${baseUrl}/dashboard" class="cta-button">View Full Dashboard</a>
                  </div>
                  
                  <p>Keep up the great work on securing your code! 🚀</p>
              </div>

              <div class="footer">
                  <p>SecureFlow AI - AI-Powered Security Analysis</p>
                  <p>🔒 Weekly insights to keep your code secure</p>
              </div>
          </div>
      </body>
      </html>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'SecureFlow AI <digest@secureflow.ai>',
        to: userEmail,
        subject: '📊 Your Weekly Security Digest - SecureFlow AI',
        html: htmlContent,
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Digest email sent to: ${userEmail}`);
    } catch (error) {
      logger.error('Failed to send digest email:', error);
    }
  }
}

export default new NotificationService();