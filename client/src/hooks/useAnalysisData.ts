import { useCallback } from 'react'
import { useAppState } from './useAppState'

interface UseAnalysisDataResult {
  getAnalysisData: (projectId: string) => any
  setAnalysisData: (projectId: string, data: any) => void
  refreshAnalysis: (projectId: string) => Promise<any>
  isStale: (projectId: string) => boolean
  invalidate: (projectId: string) => void
}

export const useAnalysisData = (): UseAnalysisDataResult => {
  const { 
    analysisResults, 
    setAnalysisResults, 
    invalidateAnalysis, 
    isAnalysisStale 
  } = useAppState()

  const getAnalysisData = useCallback((projectId: string) => {
    return analysisResults[projectId] || null
  }, [analysisResults])

  const setAnalysisData = useCallback((projectId: string, data: any) => {
    setAnalysisResults(projectId, {
      vulnerabilities: data.vulnerabilities || [],
      summary: data.summary || {},
      scanId: data.scanId || Date.now().toString(),
      lastScan: Date.now()
    })
  }, [setAnalysisResults])

  const refreshAnalysis = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/analysis`)
      const data = await response.json()
      setAnalysisData(projectId, data)
      return data
    } catch (error) {
      console.error('Failed to refresh analysis:', error)
      throw error
    }
  }, [setAnalysisData])
  const isStale = useCallback((projectId: string) => {
    return isAnalysisStale(projectId)
  }, [isAnalysisStale])

  const invalidate = useCallback((projectId: string) => {
    invalidateAnalysis(projectId)
  }, [invalidateAnalysis])

  return {
    getAnalysisData,
    setAnalysisData,
    refreshAnalysis,
    isStale,
    invalidate
  }
}