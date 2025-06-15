import { useCallback, useEffect, useRef, useState } from 'react'
import { useAnalysisData } from './useAnalysisData'
import { notificationAPI, handleApiError } from '../utils/api'

interface Notification {
  _id: string
  projectId?: string
  type: 'ANALYSIS_STARTED' | 'ANALYSIS_COMPLETED' | 'ANALYSIS_FAILED' | 'WEBHOOK_RECEIVED'
  title: string
  message: string
  createdAt: string
}

export const useNotificationPolling = () => {
  const { invalidate } = useAnalysisData()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPolledRef = useRef<Date>(new Date())

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null)
      const data = await notificationAPI.getAll({
        unread: true,
        limit: 50
      })
      // Add a defensive check to ensure the API returned the expected data structure
      if (!data || !data.notifications) {
        console.warn('Received invalid data from notification API, skipping update.');
        if (data && data.error === 'Invalid token') {
            stopPolling();
        }
        return;
      }
      const newNotifications = data.notifications.filter(
        (n: Notification) => new Date(n.createdAt) > lastPolledRef.current
      )

      newNotifications.forEach((notification: Notification) => {
        if (notification.projectId) {
          console.log(`${notification.type} for project ${notification.projectId}`)
          invalidate(notification.projectId)
        }
      })

      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
      lastPolledRef.current = new Date()
    } catch (error: any) {
      const errorMessage = handleApiError(error)
      console.error('Failed to fetch notifications:', errorMessage)
      setError(errorMessage)
      
      // If it's an auth error, stop polling to prevent spam
      if (error.response?.status === 401) {
        stopPolling()
      }
    }
  }, [invalidate])

  const markAsRead = useCallback(async (notificationIds?: string[], markAll: boolean = false) => {
    try {
      await notificationAPI.markAsRead({ notificationIds, markAll })
      // Refresh notifications after marking as read
      await fetchNotifications()
    } catch (error: any) {
      const errorMessage = handleApiError(error)
      console.error('Failed to mark notifications as read:', errorMessage)
      setError(errorMessage)
    }
  }, [fetchNotifications])

  const startPolling = useCallback(() => {
    if (intervalRef.current) return
    fetchNotifications()
    intervalRef.current = setInterval(fetchNotifications, 10000)
  }, [fetchNotifications])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    startPolling()
    return () => stopPolling()
  }, [startPolling, stopPolling])

  return {
    notifications,
    unreadCount,
    error,
    fetchNotifications,
    markAsRead,
    startPolling,
    stopPolling
  }
}
