import Head from 'next/head'
import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Shield, GitBranch, Plus, AlertCircle, Settings, ArrowRight } from 'lucide-react'
import { useUser, UserProfile } from '@/components/UserProvider'
import Dashboard from '@/components/Dashboard'
import ProjectSetup from '@/components/ProjectSetup'
import GitLabSettings from '@/components/GitLabSettings'
import { projectAPI, systemAPI } from '@/utils/api'
import { useRouter } from 'next/router'
import { Project } from '@/types'
import { useAppState } from '@/hooks/useAppState'

export default function DashboardPage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const { 
    projects, 
    selectedProject, 
    systemHealth, 
    setProjects, 
    setSelectedProject, 
    setSystemHealth,
    isHealthStale 
  } = useAppState()
  
  const [triggerProjectSetup, setTriggerProjectSetup] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState('')
  const [showGitLabSettings, setShowGitLabSettings] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const loadProjects = useCallback(async () => {
    const projectData = await projectAPI.getAll()
    setProjects(projectData)
    return projectData
  }, [setProjects])

  const checkSystemHealth = useCallback(async () => {
    try {
      const health = await systemAPI.validateCredentials()
      setSystemHealth(health)
      return health
    } catch (error: any) {
      const errorHealth = {
        status: 'error',
        message: 'Failed to validate system configuration',
        details: {
          errors: ['Unable to connect to system validation service'],
          environment: { mongodbUri: false, geminiApiKey: false, jwtSecret: false },
          services: { mongodb: false, ai: false }
        }
      }
      setSystemHealth(errorHealth)
      return errorHealth
    }
  }, [setSystemHealth])

  // Initialize data once
  useEffect(() => {
    if (loading || initialized || !user) return

    const init = async () => {
      setLoadingData(true)
      try {
        // Load projects if empty
        if (projects.length === 0) {
          await loadProjects()
        }
        
        // Only select project if explicitly requested in URL
        if (router.query.project && projects.length > 0) {
          const requestedProject = projects.find((p: any) => p._id === router.query.project)
          if (requestedProject) {
            setSelectedProject(requestedProject)
          }
        }
        
        // Check health if needed
        if (!systemHealth || isHealthStale()) {
          await checkSystemHealth()
        }
        
        setInitialized(true)
      } catch (err: any) {
        setError('Failed to load data')
      } finally {
        setLoadingData(false)
      }
    }

    init()
  }, [user, loading, initialized])

  // Handle URL project selection - only if different from current
  useEffect(() => {
    if (router.query.project && projects.length > 0 && initialized) {
      const project = projects.find(p => p._id === router.query.project)
      if (project && project._id !== selectedProject?._id) {
        setSelectedProject(project)
      } else if (!project && projects.length > 0) {
        // Invalid project ID, redirect to first project
        setSelectedProject(projects[0])
        router.replace(`/dashboard?project=${projects[0]._id}`, undefined, { shallow: true })
      }
    }
  }, [router.query.project, projects, selectedProject, setSelectedProject, initialized])

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleProjectCreated = useCallback((newProject: any) => {
    setProjects([...projects, newProject])
    setTriggerProjectSetup(false)
    setSelectedProject(newProject)
    router.push(`/dashboard?project=${newProject._id}`, undefined, { shallow: true })
  }, [projects, setProjects, setSelectedProject, router])

  const handleGitLabConfigured = useCallback(() => {
    setTriggerProjectSetup(true)
    setShowGitLabSettings(false)
  }, [])

  const handleProjectChange = useCallback((project: Project) => {
    setSelectedProject(project)
    router.push(`/dashboard?project=${project._id}`, undefined, { shallow: true })
  }, [setSelectedProject, router])

  const handleRetrySystemCheck = useCallback(async () => {
    setLoadingData(true)
    setError('')
    try {
      await checkSystemHealth()
    } catch (err) {
      setError('System check failed')
    } finally {
      setLoadingData(false)
    }
  }, [checkSystemHealth])

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-cyber-blue border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!user) return null

  // System health error screen
  if (systemHealth?.status !== 'healthy') {
    return (
      <>
        <Head>
          <title>SecureFlow AI - System Configuration</title>
        </Head>
        <div className="min-h-screen bg-dark-bg text-white">
          <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Shield className="w-8 h-8 text-cyber-blue" />
                  <h1 className="text-2xl font-bold">SecureFlow AI</h1>
                </div>
                <UserProfile
                  onGitLabConfigured={handleGitLabConfigured}
                  showGitLabSettings={showGitLabSettings}
                  setShowGitLabSettings={setShowGitLabSettings}
                />
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-6 py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">System Configuration Required</h2>
              <p className="text-gray-400 mb-8">
                Please ensure all system dependencies are properly configured.
              </p>

              <div className="bg-dark-card border border-red-500/50 rounded-xl p-6 text-left mb-6">
                <h3 className="text-lg font-semibold mb-4 text-red-400">Configuration Issues:</h3>
                <ul className="space-y-2 mb-6">
                  {systemHealth?.details?.errors?.map((error: string, index: number) => (
                    <li key={index} className="text-sm text-gray-300">• {error}</li>
                  ))}
                </ul>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {systemHealth?.details?.environment && Object.entries(systemHealth.details.environment).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-gray-400">{key}:</span>
                      <span className={value ? 'text-green-400 ml-2' : 'text-red-400 ml-2'}>
                        {value ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleRetrySystemCheck}
                disabled={loadingData}
                className="bg-cyber-blue hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                {loadingData ? 'Checking...' : 'Retry System Check'}
              </button>
            </motion.div>
          </div>

          <GitLabSettings
            isOpen={showGitLabSettings}
            onClose={() => setShowGitLabSettings(false)}
            onSuccess={handleGitLabConfigured}
            currentSettings={user?.gitlabSettings}
          />
        </div>
      </>
    )
  }

  // Dashboard with or without selected project
  return (
    <>
      <Head>
        <title>{selectedProject ? `${selectedProject.name} - SecureFlow AI` : 'Dashboard - SecureFlow AI'}</title>
      </Head>
      <div className="min-h-screen bg-dark-bg text-white">
        <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Shield className="w-8 h-8 text-cyber-blue" />
                <div>
                  <h1 className="text-2xl font-bold">SecureFlow AI</h1>
                  {selectedProject && (
                    <p className="text-gray-400 text-sm">Project: {selectedProject.name}</p>
                  )}
                </div>
                {projects.length > 1 && (
                  <select
                    value={selectedProject?._id || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        const project = projects.find(p => p._id === e.target.value)
                        if (project) handleProjectChange(project)
                      } else {
                        setSelectedProject(null)
                        router.push('/dashboard', undefined, { shallow: true })
                      }
                    }}
                    className="bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-cyber-blue focus:outline-none"
                  >
                    <option value="">All Projects</option>
                    {projects.map(project => (
                      <option key={project._id} value={project._id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <motion.button
                  onClick={() => router.push('/projects')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center"
                >
                  <GitBranch className="w-4 h-4 mr-2" />
                  All Projects
                </motion.button>
                <motion.button
                  onClick={() => setTriggerProjectSetup(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-cyber-blue hover:bg-blue-600 text-black font-semibold py-2 px-4 rounded-lg transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Project
                </motion.button>
                <UserProfile
                  onGitLabConfigured={handleGitLabConfigured}
                  showGitLabSettings={showGitLabSettings}
                  setShowGitLabSettings={setShowGitLabSettings}
                />
              </div>
            </div>
          </div>
        </div>

        <Dashboard projectId={selectedProject?._id} />

        {triggerProjectSetup && (
          <ProjectSetup
            onProjectCreated={handleProjectCreated}
            triggerOpen={triggerProjectSetup}
            onClose={() => setTriggerProjectSetup(false)}
          />
        )}

        <GitLabSettings
          isOpen={showGitLabSettings}
          onClose={() => setShowGitLabSettings(false)}
          onSuccess={handleGitLabConfigured}
          currentSettings={user?.gitlabSettings}
        />
      </div>
    </>
  )
}