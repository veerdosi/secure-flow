import Head from 'next/head'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, GitBranch, Plus, AlertCircle, Settings, Zap } from 'lucide-react'
import { useUser, UserProfile } from '@/components/UserProvider'
import Dashboard from '@/components/Dashboard'
import ProjectSetup from '@/components/ProjectSetup'
import { projectAPI, systemAPI } from '@/utils/api'
import { useRouter } from 'next/router'

interface Project {
  _id: string
  name: string
  gitlabProjectId: string
  repositoryUrl: string
  branch: string
  lastScanDate?: string
}

export default function DashboardPage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [triggerProjectSetup, setTriggerProjectSetup] = useState(false)
  const [systemHealth, setSystemHealth] = useState<any>(null)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
      return
    }
    if (user) {
      loadProjects()
      checkSystemHealth()
    }
  }, [user, loading, router])

  useEffect(() => {
    // Handle project selection from URL
    if (router.query.project && projects.length > 0) {
      const project = projects.find(p => p._id === router.query.project)
      if (project) {
        setSelectedProject(project)
      }
    }
  }, [router.query.project, projects])

  const loadProjects = async () => {
    setLoadingProjects(true)
    try {
      const projectData = await projectAPI.getAll()
      setProjects(projectData)
      
      // Auto-select first project if available and no project in URL
      if (projectData.length > 0 && !selectedProject && !router.query.project) {
        setSelectedProject(projectData[0])
        router.push(`/dashboard?project=${projectData[0]._id}`, undefined, { shallow: true })
      }
    } catch (error: any) {
      console.error('Failed to load projects:', error)
      setError('Failed to load projects. Please try again.')
    } finally {
      setLoadingProjects(false)
    }
  }

  const checkSystemHealth = async () => {
    try {
      const health = await systemAPI.validateCredentials()
      setSystemHealth(health)
      
      if (health.status !== 'healthy') {
        console.warn('System health check failed:', health.details?.errors)
      }
    } catch (error: any) {
      console.error('System health check failed:', error)
      setSystemHealth({
        status: 'error',
        message: 'Failed to validate system configuration'
      })
    }
  }

  const handleProjectCreated = (newProject: any) => {
    setProjects(prev => [...prev, newProject])
    setSelectedProject(newProject)
    setTriggerProjectSetup(false)
    router.push(`/dashboard?project=${newProject._id}`, undefined, { shallow: true })
  }

  const handleProjectChange = (project: Project) => {
    setSelectedProject(project)
    router.push(`/dashboard?project=${project._id}`, undefined, { shallow: true })
  }

  if (loading) {
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

  if (!user) {
    return null // Router will redirect
  }

  // System health warning
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
                <UserProfile onGitLabConfigured={() => setTriggerProjectSetup(true)} />
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
                Please ensure all system dependencies are properly configured before proceeding.
              </p>

              <div className="bg-dark-card border border-red-500/50 rounded-xl p-6 text-left">
                <h3 className="text-lg font-semibold mb-4 text-red-400">Configuration Issues:</h3>
                <ul className="space-y-2">
                  {systemHealth?.details?.errors?.map((error: string, index: number) => (
                    <li key={index} className="text-sm text-gray-300">
                      • {error}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 pt-4 border-t border-gray-700">
                  <h4 className="font-medium mb-2">Required Environment Variables:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">MONGODB_URI:</span>
                      <span className={systemHealth?.details?.environment?.mongodbUri ? 'text-green-400 ml-2' : 'text-red-400 ml-2'}>
                        {systemHealth?.details?.environment?.mongodbUri ? '✓' : '✗'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">GEMINI_API_KEY:</span>
                      <span className={systemHealth?.details?.environment?.geminiApiKey ? 'text-green-400 ml-2' : 'text-red-400 ml-2'}>
                        {systemHealth?.details?.environment?.geminiApiKey ? '✓' : '✗'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">JWT_SECRET:</span>
                      <span className={systemHealth?.details?.environment?.jwtSecret ? 'text-green-400 ml-2' : 'text-red-400 ml-2'}>
                        {systemHealth?.details?.environment?.jwtSecret ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={checkSystemHealth}
                className="mt-6 bg-cyber-blue hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Retry System Check
              </button>
            </motion.div>
          </div>
        </div>
      </>
    )
  }

  // Dashboard with projects
  if (selectedProject) {
    return (
      <>
        <Head>
          <title>{`${selectedProject.name} - SecureFlow AI`}</title>
        </Head>
        
        <div className="min-h-screen bg-dark-bg text-white">
          {/* Header with project selector */}
          <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Shield className="w-8 h-8 text-cyber-blue" />
                  <h1 className="text-2xl font-bold">SecureFlow AI</h1>
                  {projects.length > 1 && (
                    <select
                      value={selectedProject._id}
                      onChange={(e) => {
                        const project = projects.find(p => p._id === e.target.value)
                        if (project) handleProjectChange(project)
                      }}
                      className="bg-dark-card border border-dark-border rounded-lg px-3 py-1 text-sm"
                    >
                      {projects.map(project => (
                        <option key={project._id} value={project._id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <UserProfile onGitLabConfigured={() => setTriggerProjectSetup(true)} />
              </div>
            </div>
          </div>
          
          <Dashboard projectId={selectedProject._id} />
        </div>
      </>
    )
  }

  // Empty state - no projects configured
  return (
    <>
      <Head>
        <title>SecureFlow AI - Add Your First Project</title>
      </Head>
      
      <div className="min-h-screen bg-dark-bg text-white">
        <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Shield className="w-8 h-8 text-cyber-blue" />
                <h1 className="text-2xl font-bold">SecureFlow AI</h1>
              </div>
              <UserProfile onGitLabConfigured={() => setShowProjectSetup(true)} />
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
            <p className="text-gray-400 mb-8">
              Connect your GitLab projects to start monitoring your code security in real-time.
            </p>

            {!user.gitlabSettings?.apiToken ? (
              <div className="bg-dark-card border border-orange-500/50 rounded-xl p-6 mb-8">
                <Settings className="w-8 h-8 text-orange-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-orange-400">GitLab Configuration Required</h3>
                <p className="text-gray-400 mb-4">
                  You need to configure your GitLab API token before adding projects.
                </p>
                <button
                  onClick={() => {
                    // This will be handled by the UserProfile component
                    const settingsBtn = document.querySelector('[data-gitlab-settings]') as HTMLElement
                    settingsBtn?.click()
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Configure GitLab Settings
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <ProjectSetup 
                  onProjectCreated={handleProjectCreated} 
                  triggerOpen={triggerProjectSetup}
                />
              </div>
            )}

            {error && (
              <div className="mt-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </motion.div>
        </div>

      </div>
    </>
  )
}