import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Project } from '@/types'

interface AnalysisResults {
  vulnerabilities: any[]
  summary: any
  lastScan: number
  scanId: string
}

interface AppState {
  systemHealth: any
  lastHealthCheck: number
  projects: Project[]
  selectedProject: Project | null
  analysisResults: Record<string, AnalysisResults> // projectId -> results
  _hasHydrated: boolean
  setSystemHealth: (health: any) => void
  setProjects: (projects: Project[]) => void
  setSelectedProject: (project: Project | null) => void
  setAnalysisResults: (projectId: string, results: AnalysisResults) => void
  invalidateAnalysis: (projectId: string) => void
  isAnalysisStale: (projectId: string, maxAge?: number) => boolean
  clearState: () => void
  isHealthStale: () => boolean
  setHasHydrated: (state: boolean) => void
}

export const useAppState = create<AppState>()(
  persist(
    (set, get) => ({
      systemHealth: null,
      lastHealthCheck: 0,
      projects: [],
      selectedProject: null,
      analysisResults: {},
      _hasHydrated: false,
      
      setSystemHealth: (health) => set({ 
        systemHealth: health, 
        lastHealthCheck: Date.now() 
      }),
      
      setProjects: (projects) => set({ projects }),
      
      setSelectedProject: (project) => set({ selectedProject: project }),
      
      setAnalysisResults: (projectId, results) => {
        const { analysisResults } = get()
        set({ 
          analysisResults: {
            ...analysisResults,
            [projectId]: {
              ...results,
              lastScan: Date.now()
            }
          }
        })
      },
      
      invalidateAnalysis: (projectId) => {
        const { analysisResults } = get()
        const updated = { ...analysisResults }
        delete updated[projectId]
        set({ analysisResults: updated })
      },
      
      // Check if analysis is older than specified time (default 10 minutes)
      isAnalysisStale: (projectId, maxAge = 600000) => {
        const { analysisResults } = get()
        const analysis = analysisResults[projectId]
        if (!analysis) return true
        return Date.now() - analysis.lastScan > maxAge
      },
      
      clearState: () => set({ 
        systemHealth: null, 
        lastHealthCheck: 0, 
        projects: [], 
        selectedProject: null,
        analysisResults: {}
      }),      
      
      // Check if health check is older than 5 minutes
      isHealthStale: () => {
        const { lastHealthCheck } = get()
        return Date.now() - lastHealthCheck > 300000
      },

      setHasHydrated: (state) => set({ _hasHydrated: state })
    }),
    {
      name: 'secure-flow-state',
      storage: createJSONStorage(() => {
        // Only use localStorage on client-side
        if (typeof window !== 'undefined') {
          return localStorage
        }
        // Fallback for SSR - return null storage to prevent hydration issues
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {}
        }
      }),
      partialize: (state) => ({
        systemHealth: state.systemHealth,
        lastHealthCheck: state.lastHealthCheck,
        projects: state.projects,
        selectedProject: state.selectedProject,
        analysisResults: state.analysisResults
      }),
      onRehydrateStorage: () => (state, error) => {
        // Enhanced error handling for hydration
        if (error) {
          // console.error('Failed to rehydrate state:', error); // Commented out to prevent client-side error visibility
          // Reset to initial state if hydration fails
          state?.clearState?.()
        }
        state?.setHasHydrated(true)
      }
    }
  )
)