import { useCallback } from 'react'
import useSWR from 'swr'
import { notificationAPI } from '../utils/api'

interface Notification {
  _id: string
  projectId?: string
  type: 'ANALYSIS_STARTED' | 'ANALYSIS_COMPLETED' | 'ANALYSIS_FAILED' | 'WEBHOOK_RECEIVED'
  title: string
  message: string
  createdAt: string
}

interface NotificationResponse {
  notifications: Notification[]
  unreadCount: number
}

const fetcher = async (): Promise<NotificationResponse> => {
  try {
    const data = await notificationAPI.getAll({
      unread: true,
      limit: 50
    })
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      return { notifications: [], unreadCount: 0 }
    }
    
    return {
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
      unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0
    }
  } catch (error: any) {
    // Handle auth errors gracefully
    if (error?.response?.status === 401) {
      return { notifications: [], unreadCount: 0 }
    }
    // Return empty data for any other errors
    console.warn('Notification fetch error:', error?.message || 'Unknown error')
    return { notifications: [], unreadCount: 0 }
  }
}

export const useNotificationPolling = () => {
  const { data, error, mutate } = useSWR<NotificationResponse>(
    'notifications',
    fetcher,
    {
      refreshInterval: 10000, // Poll every 10 seconds
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      shouldRetryOnError: false, // Don't retry on errors to prevent spam
      fallbackData: { notifications: [], unreadCount: 0 },
      onError: (err) => {
        // Silently handle errors
        console.warn('SWR notification error:', err?.message || 'Unknown error')
      }
    }
  )

  const markAsRead = useCallback(async (notificationIds?: string[], markAll: boolean = false) => {
    try {
      await notificationAPI.markAsRead({ notificationIds, markAll })
      // Refresh notifications after marking as read
      mutate()
    } catch (error: any) {
      console.warn('Failed to mark notifications as read:', error?.message || 'Unknown error')
    }
  }, [mutate])

  const startPolling = useCallback(() => {
    // SWR handles polling automatically with refreshInterval
    mutate()
  }, [mutate])

  const stopPolling = useCallback(() => {
    // Can't easily stop SWR polling, but errors are handled gracefully
  }, [])

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    error: error ? 'Failed to load notifications' : null,
    fetchNotifications: mutate,
    markAsRead,
    startPolling,
    stopPolling
  }
}
