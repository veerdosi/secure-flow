import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Notification } from '../models';
import logger from '../utils/logger';

const router = Router();

// Get notifications for the authenticated user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const unreadOnly = req.query.unread === 'true';
    const projectId = req.query.projectId as string;

    const query: any = { userId };
    if (unreadOnly) query.read = false;
    if (projectId) query.projectId = projectId;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, read: false });

    res.json({
      notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      unreadCount
    });
  } catch (error) {
    logger.error('Failed to get notifications:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

// Mark notifications as read
router.patch('/read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { notificationIds, markAll = false } = req.body;

    if (markAll) {
      await Notification.updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() }
      );
    } else if (notificationIds && Array.isArray(notificationIds)) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, userId },
        { read: true, readAt: new Date() }
      );
    } else {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const unreadCount = await Notification.countDocuments({ userId, read: false });
    res.json({ message: 'Notifications marked as read', unreadCount });
  } catch (error) {
    logger.error('Failed to mark notifications as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// Get notification stats
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const [unreadCount, totalCount] = await Promise.all([
      Notification.countDocuments({ userId, read: false }),
      Notification.countDocuments({ userId })
    ]);

    res.json({ unreadCount, totalCount });
  } catch (error) {
    logger.error('Failed to get notification stats:', error);
    res.status(500).json({ error: 'Failed to retrieve notification stats' });
  }
});

export default router;
