import { useAppState } from './useAppState'
import { useAnalysisData } from './useAnalysisData'
import { useEffect, useCallback } from 'react'

interface WebhookPayload {
  type: 'push' | 'merge_request' | 'analysis_complete'
  projectId: string
  commitId?: string
  analysisId?: string
  data?: any
}

export const useWebhookHandler = () => {
  const { invalidate } = useAnalysisData()
  const { setAnalysisResults } = useAppState()

  const handleWebhookMessage = useCallback((event: MessageEvent) => {
    try {
      const payload: WebhookPayload = JSON.parse(event.data)
      
      switch (payload.type) {
        case 'push':
        case 'merge_request':
          // Invalidate analysis cache when code changes
          if (payload.projectId) {
            invalidate(payload.projectId)
            console.log(`Analysis invalidated for project ${payload.projectId}`)
          }
          break
          
        case 'analysis_complete':
          // Update with fresh analysis results
          if (payload.projectId && payload.data) {
            setAnalysisResults(payload.projectId, {
              ...payload.data,
              lastScan: Date.now(),
              scanId: payload.analysisId || Date.now().toString()
            })
            console.log(`Analysis updated for project ${payload.projectId}`)
          }
          break
      }
    } catch (error) {
      console.error('Failed to parse webhook message:', error)
    }
  }, [invalidate, setAnalysisResults])

  useEffect(() => {
    // Connect to WebSocket or SSE for real-time updates
    const connectWebSocket = () => {
      const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001')
      
      ws.onopen = () => {
        console.log('Connected to webhook stream')
      }
      
      ws.onmessage = handleWebhookMessage
      
      ws.onclose = () => {
        console.log('Webhook connection closed, reconnecting...')
        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000)
      }
      
      return ws
    }

    const ws = connectWebSocket()
    
    return () => {
      ws.close()
    }
  }, [handleWebhookMessage])
}