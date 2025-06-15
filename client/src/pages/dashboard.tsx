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
          const projectData = await loadProjects()
          
          // Don't auto-select project, let user choose
          if (projectData.length > 0 && router.query.project) {
            const requestedProject = projectData.find((p: any) => p._id === router.query.project)
            if (requestedProject) {
              setSelectedProject(requestedProject)
            }
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

  // Handle URL project selection
  useEffect(() => {
    if (router.query.project && projects.length > 0) {
      const project = projects.find(p => p._id === router.query.project)
      if (project && project._id !== selectedProject?._id) {
        setSelectedProject(project)
      }
    }
  }, [router.query.project, projects, selectedProject, setSelectedProject])

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
    router.push(`/projects/${newProject._id}`)
  }, [projects, setProjects, setSelectedProject, router])

  const handleGitLabConfigured = useCallback(() => {
    setTriggerProjectSetup(true)
    setShowGitLabSettings(false)
  }, [])

  const handleProjectChange = useCallback((project: Project) => {
    setSelectedProject(project)
    router.push(`/projects/${project._id}`)
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
          <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm relative z-[10000]">
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

  // Dashboard with selected project
  if (selectedProject) {
    return (
      <>
        <Head>
          <title>{`${selectedProject.name} - SecureFlow AI`}</title>
        </Head>
        <div className="min-h-screen bg-dark-bg text-white">
          <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Shield className="w-8 h-8 text-cyber-blue" />
                  <div>
                    <h1 className="text-2xl font-bold">SecureFlow AI</h1>
                    <p className="text-gray-400 text-sm">Project: {selectedProject.name}</p>
                  </div>
                  {projects.length > 1 && (
                    <select
                      value={selectedProject._id}
                      onChange={(e) => {
                        const project = projects.find(p => p._id === e.target.value)
                        if (project) handleProjectChange(project)
                      }}
                      className="bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-cyber-blue focus:outline-none"
                    >
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

          <Dashboard projectId={selectedProject._id} />

          {triggerProjectSetup && (
            <ProjectSetup
              onProjectCreated={handleProjectCreated}
              isOpen={triggerProjectSetup} 
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

  // Projects exist but none selected - show project selection
  if (projects.length > 0) {
    return (
      <>
        <Head>
          <title>Select Project - SecureFlow AI</title>
        </Head>
        <div className="min-h-screen bg-dark-bg text-white">
          <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm relative z-[10000]">
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

          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <Shield className="w-16 h-16 text-cyber-blue mx-auto mb-6" />
                <h2 className="text-3xl font-bold mb-4">Select a Project</h2>
                <p className="text-gray-400 text-lg">
                  Choose a project to view its security analysis dashboard
                </p>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {projects.map((project, index) => (
                <motion.div
                  key={project._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleProjectChange(project)}
                  className="bg-dark-card border border-dark-border rounded-xl p-6 hover:border-cyber-blue/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white group-hover:text-cyber-blue transition-colors">
                      {project.name}
                    </h3>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyber-blue group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-gray-400 text-sm mb-4 truncate">{project.repositoryUrl}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Branch: {project.branch}</span>
                    <span className="text-gray-500">Scan: {project.scanFrequency}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  // No projects state
  return (
    <>
      <Head>
        <title>SecureFlow AI - Add Your First Project</title>
      </Head>
      <div className="min-h-screen bg-dark-bg text-white">
        <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm relative z-[10000]">
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
            <GitBranch className="w-16 h-16 text-cyber-blue mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">No Projects Configured</h2>
            <p className="text-gray-400 mb-8 text-lg">
              Connect your GitLab projects to start monitoring your code security in real-time.
            </p>

            {!user.gitlabSettings?.apiToken ? (
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/50 rounded-xl p-8 mb-8 max-w-2xl mx-auto">
                <div className="flex items-center justify-center mb-4">
                  <Settings className="w-8 h-8 text-orange-400 mr-3" />
                  <h3 className="text-xl font-semibold text-orange-400">GitLab Configuration Required</h3>
                </div>
                <p className="text-gray-300 mb-6">
                  Configure your GitLab API token to start adding projects.
                </p>
                <button
                  onClick={() => setShowGitLabSettings(true)}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center mx-auto"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  Configure GitLab Settings
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="bg-dark-card border border-dark-border rounded-xl p-8 mb-8 max-w-lg">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-cyber-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-6 h-6 text-cyber-green" />
                    </div>
                    <h3 className="text-lg font-semibold text-cyber-green mb-2">GitLab Connected!</h3>
                    <p className="text-gray-400 mb-4">
                      Your GitLab integration is ready. Add your first project to start monitoring.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <ProjectSetup
                    onProjectCreated={handleProjectCreated}
                    isOpen={triggerProjectSetup} 
                    onClose={() => setTriggerProjectSetup(false)}
                  />
                  <button
                    onClick={() => router.push('/projects')}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center"
                  >
                    <GitBranch className="w-5 h-5 mr-2" />
                    View All Projects
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 max-w-lg mx-auto">
                <p className="text-red-400">{error}</p>
                <button
                  onClick={() => {
                    setInitialized(false)
                    setError('')
                  }}
                  className="mt-2 text-cyber-blue hover:text-blue-400 text-sm underline"
                >
                  Try again
                </button>
              </div>
            )}
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