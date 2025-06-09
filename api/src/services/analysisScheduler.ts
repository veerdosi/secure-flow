import cron from 'node-cron';
import { Project, Analysis, User } from '../models';
import { processAnalysis } from '../routes/analysis';
import logger from '../utils/logger';

class AnalysisScheduler {
  private static instance: AnalysisScheduler;
  private dailyTask?: cron.ScheduledTask;
  private weeklyTask?: cron.ScheduledTask;

  public static getInstance(): AnalysisScheduler {
    if (!AnalysisScheduler.instance) {
      AnalysisScheduler.instance = new AnalysisScheduler();
    }
    return AnalysisScheduler.instance;
  }

  public start(): void {
    this.scheduleDaily();
    this.scheduleWeekly();
    logger.info('✅ Analysis scheduler started');
  }

  public stop(): void {
    if (this.dailyTask) this.dailyTask.stop();
    if (this.weeklyTask) this.weeklyTask.stop();
    logger.info('⏹️ Analysis scheduler stopped');
  }

  private scheduleDaily(): void {
    this.dailyTask = cron.schedule('0 2 * * *', async () => {
      logger.info('🔄 Running daily scheduled analyses...');
      await this.runScheduledAnalyses('DAILY');
    }, { scheduled: true, timezone: 'UTC' });
  }

  private scheduleWeekly(): void {
    this.weeklyTask = cron.schedule('0 1 * * 0', async () => {
      logger.info('🔄 Running weekly scheduled analyses...');
      await this.runScheduledAnalyses('WEEKLY');
    }, { scheduled: true, timezone: 'UTC' });
  }

  private async runScheduledAnalyses(frequency: 'DAILY' | 'WEEKLY'): Promise<void> {
    try {
      const projects = await Project.find({ scanFrequency: frequency });
      logger.info(`Found ${projects.length} projects with ${frequency} scan frequency`);

      for (const project of projects) {
        try {
          await this.triggerAnalysisForProject(project, frequency);
        } catch (error) {
          logger.error(`Failed to trigger analysis for project ${project._id}:`, error);
        }
      }
    } catch (error) {
      logger.error(`Failed to run ${frequency} scheduled analyses:`, error);
    }
  }

  private async triggerAnalysisForProject(project: any, frequency: string): Promise<void> {
    try {
      // Check if there's already a running analysis
      const runningAnalysis = await Analysis.findOne({
        projectId: project._id,
        status: { $in: ['PENDING', 'IN_PROGRESS'] }
      });

      if (runningAnalysis) {
        logger.warn(`Skipping scheduled analysis for project ${project._id} - analysis already running`);
        return;
      }

      // Check if we should skip based on recent analysis
      if (await this.shouldSkipAnalysis(project, frequency)) {
        logger.info(`Skipping ${frequency} analysis for project ${project._id} - recent analysis found`);
        return;
      }

      // Get project owner
      const owner = await User.findById(project.createdBy);
      if (!owner) {
        logger.error(`No owner found for project ${project._id}`);
        return;
      }

      // Create new analysis
      const analysis = new Analysis({
        projectId: project._id,
        commitHash: 'latest',
        securityScore: 0,
        threatLevel: 'LOW',
        vulnerabilities: [],
        threatModel: {},
        aiAnalysis: '',
        remediationSteps: [],
        complianceScore: {},
        status: 'PENDING',
        stage: 'INITIALIZING',
        progress: 0,
        triggeredBy: 'scheduled',
        userId: owner._id,
        history: []
      });

      await analysis.save();
      await Project.findByIdAndUpdate(project._id, { lastScanDate: new Date() });

      // Start background analysis
      processAnalysis(analysis._id.toString(), project._id, 'main').catch(error => {
        logger.error(`Scheduled analysis failed for project ${project._id}:`, error);
      });

      logger.info(`✅ Triggered ${frequency} analysis for project ${project.name} (${project._id})`);
    } catch (error) {
      logger.error(`Failed to trigger analysis for project ${project._id}:`, error);
    }
  }

  private async shouldSkipAnalysis(project: any, frequency: string): Promise<boolean> {
    const now = new Date();
    let cutoffTime: Date;

    switch (frequency) {
      case 'DAILY':
        cutoffTime = new Date(now.getTime() - 20 * 60 * 60 * 1000); // 20 hours ago
        break;
      case 'WEEKLY':
        cutoffTime = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000); // 6 days ago
        break;
      default:
        return false;
    }

    const recentAnalysis = await Analysis.findOne({
      projectId: project._id,
      status: 'COMPLETED',
      completedAt: { $gte: cutoffTime }
    });

    return !!recentAnalysis;
  }

  public async triggerManualScheduledRun(frequency: 'DAILY' | 'WEEKLY'): Promise<void> {
    logger.info(`🔧 Manually triggering ${frequency} scheduled analyses...`);
    await this.runScheduledAnalyses(frequency);
  }
}

export default AnalysisScheduler;
