import { Notification } from '../models';
import logger from '../utils/logger';

export interface CreateNotificationData {
  userId: string;
  projectId?: string;
  analysisId?: string;
  type: 'ANALYSIS_STARTED' | 'ANALYSIS_COMPLETED' | 'ANALYSIS_FAILED' | 'PROJECT_CREATED' | 'WEBHOOK_RECEIVED';
  title: string;
  message: string;
  data?: any;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

class NotificationService {
  async createNotification(notificationData: CreateNotificationData) {
    try {
      const notification = new Notification({
        userId: notificationData.userId,
        projectId: notificationData.projectId,
        analysisId: notificationData.analysisId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
        priority: notificationData.priority || 'MEDIUM',
        read: false
      });

      await notification.save();
      logger.info(`Notification created for user ${notificationData.userId}: ${notificationData.title}`);
      return notification;
    } catch (error) {
      logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  async createAnalysisStartedNotification(userId: string, projectId: string, analysisId: string, projectName: string) {
    return this.createNotification({
      userId, projectId, analysisId,
      type: 'ANALYSIS_STARTED',
      title: 'Security Analysis Started',
      message: `Security analysis has started for project ${projectName}`,
      priority: 'MEDIUM'
    });
  }

  async createAnalysisCompletedNotification(
    userId: string, 
    projectId: string, 
    analysisId: string, 
    projectName: string, 
    securityScore: number, 
    threatLevel: string,
    vulnerabilityCount: number
  ) {
    return this.createNotification({
      userId, projectId, analysisId,
      type: 'ANALYSIS_COMPLETED',
      title: 'Security Analysis Completed',
      message: `Analysis complete for ${projectName}. Score: ${securityScore}/100, ${vulnerabilityCount} issues found`,
      data: { securityScore, threatLevel, vulnerabilityCount },
      priority: threatLevel === 'CRITICAL' || threatLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
    });
  }

  async createAnalysisFailedNotification(userId: string, projectId: string, analysisId: string, projectName: string, error: string) {
    return this.createNotification({
      userId, projectId, analysisId,
      type: 'ANALYSIS_FAILED',
      title: 'Security Analysis Failed',
      message: `Analysis failed for project ${projectName}: ${error}`,
      priority: 'HIGH'
    });
  }

  async createWebhookReceivedNotification(userId: string, projectId: string, projectName: string, eventType: string) {
    return this.createNotification({
      userId, projectId,
      type: 'WEBHOOK_RECEIVED',
      title: 'Webhook Event Received',
      message: `${eventType} received for project ${projectName}. Analysis will begin shortly.`,
      priority: 'LOW'
    });
  }
}

export default new NotificationService();
