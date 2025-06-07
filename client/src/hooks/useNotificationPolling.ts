import { useCallback, useEffect, useRef, useState } from 'react'
import { useAnalysisData } from './useAnalysisData'

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
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPolledRef = useRef<Date>(new Date())

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?unread=true&limit=50')
      if (!response.ok) throw new Error('Failed to fetch notifications')
      
      const data = await response.json()
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
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [invalidate])

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
    fetchNotifications,
    startPolling,
    stopPolling
  }
}
