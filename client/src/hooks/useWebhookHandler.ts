import { useNotificationPolling } from './useNotificationPolling'

export const useWebhookHandler = () => {
  // Replace WebSocket with notification polling
  const { notifications, unreadCount, startPolling, stopPolling } = useNotificationPolling()

  // Legacy interface for backward compatibility
  return {
    notifications,
    unreadCount,
    startPolling,
    stopPolling
  }
}
