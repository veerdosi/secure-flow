import Head from 'next/head'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, GitBranch, Plus, AlertCircle, Settings, Zap, ArrowRight } from 'lucide-react'
import { useUser, UserProfile } from '@/components/UserProvider'
import Dashboard from '@/components/Dashboard'
import ProjectSetup from '@/components/ProjectSetup'
import GitLabSettings from '@/components/GitLabSettings'
import { projectAPI, systemAPI } from '@/utils/api'
import { useRouter } from 'next/router'
import { Project } from '@/types'

export default function DashboardPage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [triggerProjectSetup, setTriggerProjectSetup] = useState(false)
  const [systemHealth, setSystemHealth] = useState<any>(null)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [error, setError] = useState('')
  const [showGitLabSettings, setShowGitLabSettings] = useState(false)

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

  const checkSystemHealth = async (retryCount = 0) => {
    try {
      const health = await systemAPI.validateCredentials()
      setSystemHealth(health)

      if (health.status !== 'healthy') {
        console.warn('System health check failed:', health.details?.errors)
      }
    } catch (error: any) {
      console.error('System health check failed:', error)
      
      // Retry logic for transient failures
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000
        setTimeout(() => {
          checkSystemHealth(retryCount + 1)
        }, delay)
        return
      }
      
      // Only show system error after retries have failed
      setSystemHealth({
        status: 'error',
        message: 'Failed to validate system configuration',
        details: {
          errors: ['Unable to connect to system validation service'],
          environment: {
            mongodbUri: false,
            geminiApiKey: false,
            jwtSecret: false
          },
          services: {
            mongodb: false,
            ai: false
          }
        }
      })
    }
  }

  const handleProjectCreated = (newProject: any) => {
    setProjects(prev => [...prev, newProject])
    setTriggerProjectSetup(false)

    // Immediately set the new project as selected and navigate
    setSelectedProject(newProject)
    router.push(`/dashboard?project=${newProject._id}`, undefined, { shallow: true })
  }

  const handleGitLabConfigured = () => {
    setTriggerProjectSetup(true)
    setShowGitLabSettings(false)
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
              onClick={() => checkSystemHealth()}
              className="mt-6 bg-cyber-blue hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Retry System Check
            </button>
          </motion.div>
        </div>
      </div>

      {/* GitLab Settings Modal */}
      <GitLabSettings
        isOpen={showGitLabSettings}
        onClose={() => setShowGitLabSettings(false)}
        onSuccess={handleGitLabConfigured}
        currentSettings={user?.gitlabSettings}
      />
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

        {/* Project Setup Modal */}
        {triggerProjectSetup && (
          <ProjectSetup
            onProjectCreated={handleProjectCreated}
            triggerOpen={triggerProjectSetup}
            onClose={() => setTriggerProjectSetup(false)}
          />
        )}

        {/* GitLab Settings Modal */}
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
          <div className="mb-8 relative z-10">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-block"
            >
              <GitBranch className="w-16 h-16 text-cyber-blue mx-auto mb-6" />
            </motion.div>
          </div>

          <h2 className="text-3xl font-bold mb-4">No Projects Configured</h2>
          <p className="text-gray-400 mb-8 text-lg">
            Connect your GitLab projects to start monitoring your code security in real-time.
          </p>

          {!user.gitlabSettings?.apiToken ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/50 rounded-xl p-8 mb-8 max-w-2xl mx-auto"
            >
              <div className="flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-orange-400 mr-3" />
                <h3 className="text-xl font-semibold text-orange-400">GitLab Configuration Required</h3>
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                You need to configure your GitLab API token before adding projects. This allows SecureFlow AI to access your repositories and set up webhooks for real-time analysis.
              </p>

              <div className="space-y-4 text-left mb-6">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-cyber-blue rounded-full flex items-center justify-center text-sm font-bold text-black mt-0.5">1</div>
                  <div>
                    <p className="text-white font-medium">Go to GitLab → User Settings → Access Tokens</p>
                    <p className="text-gray-400 text-sm">Create a personal access token with 'api' scope</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-cyber-blue rounded-full flex items-center justify-center text-sm font-bold text-black mt-0.5">2</div>
                  <div>
                    <p className="text-white font-medium">Copy the token and configure it in SecureFlow AI</p>
                    <p className="text-gray-400 text-sm">Click the button below to open settings</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-cyber-blue rounded-full flex items-center justify-center text-sm font-bold text-black mt-0.5">3</div>
                  <div>
                    <p className="text-white font-medium">Test connection and start adding projects</p>
                    <p className="text-gray-400 text-sm">Verify your token works correctly</p>
                  </div>
                </div>
              </div>

              <motion.button
                onClick={() => setShowGitLabSettings(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center mx-auto"
              >
                <Settings className="w-5 h-5 mr-2" />
                Configure GitLab Settings
                <ArrowRight className="w-5 h-5 ml-2" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="bg-dark-card border border-dark-border rounded-xl p-8 mb-8 max-w-lg">
                <div className="text-center">
                  <div className="w-12 h-12 bg-cyber-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-6 h-6 text-cyber-green" />
                  </div>
                  <h3 className="text-lg font-semibold text-cyber-green mb-2">GitLab Connected!</h3>
                  <p className="text-gray-400 mb-4">
                    Your GitLab integration is ready. Now you can add your first project to start monitoring.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <ProjectSetup
                  onProjectCreated={handleProjectCreated}
                  triggerOpen={triggerProjectSetup}
                  buttonText="Add Your First Project"
                  buttonIcon={<Plus className="w-5 h-5 mr-2" />}
                />
                <motion.button
                  onClick={() => router.push('/projects')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center"
                >
                  <GitBranch className="w-5 h-5 mr-2" />
                  View All Projects
                </motion.button>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 max-w-lg mx-auto"
            >
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadProjects}
                className="mt-2 text-cyber-blue hover:text-blue-400 text-sm underline"
              >
                Try again
              </button>
            </motion.div>
          )}

          {loadingProjects && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex items-center justify-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-cyber-blue border-t-transparent rounded-full mr-3"
              />
              <span className="text-gray-400">Loading projects...</span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* GitLab Settings Modal */}
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
