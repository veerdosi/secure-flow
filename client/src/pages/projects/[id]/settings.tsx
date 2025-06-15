import Head from 'next/head'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/router'
import { 
  Shield, 
  ArrowLeft, 
  Settings, 
  Save, 
  Trash2, 
  Globe, 
  GitBranch, 
  Clock, 
  Mail, 
  Bell, 
  Webhook,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Copy
} from 'lucide-react'
import { useUser } from '@/components/UserProvider'
import { projectAPI, ProjectData } from '@/utils/api'
import { Project } from '@/types'

export default function ProjectSettingsPage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const { id } = router.query

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    repositoryUrl: '',
    branch: 'main',
    scanFrequency: 'ON_PUSH' as 'ON_PUSH' | 'DAILY' | 'WEEKLY',
    notificationEmail: '',
    scanTypes: [] as string[],
    notificationSettings: {
      email: true,
      emailAddresses: [] as string[],
      slack: false,
      webhook: false,
      minSeverity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    }
  })

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
      return
    }
    if (id && user) {
      loadProject()
    }
  }, [id, user, userLoading, router])

  const loadProject = async () => {
    try {
      setLoading(true)
      const projectData = await projectAPI.getById(id as string)
      setProject(projectData)
      
      // Populate form with existing data
      setFormData({
        name: projectData.name || '',
        repositoryUrl: projectData.repositoryUrl || '',
        branch: projectData.branch || 'main',
        scanFrequency: projectData.scanFrequency || 'ON_PUSH',
        notificationEmail: projectData.notificationEmail || '',
        scanTypes: projectData.scanTypes || ['SAST', 'DEPENDENCY', 'SECRET'],
        notificationSettings: projectData.notificationSettings || {
          email: true,
          emailAddresses: [],
          slack: false,
          webhook: false,
          minSeverity: 'MEDIUM'
        }
      })
    } catch (error: any) {
      console.error('Failed to load project:', error)
      setError('Failed to load project settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const updateData: Partial<ProjectData> = {
        name: formData.name,
        repositoryUrl: formData.repositoryUrl,
        branch: formData.branch,
        scanFrequency: formData.scanFrequency,
        notificationEmail: formData.notificationEmail,
        scanTypes: formData.scanTypes,
        notificationSettings: formData.notificationSettings
      }

      await projectAPI.update(id as string, updateData)
      setSuccess('Project settings updated successfully!')
      
      // Reload project data
      await loadProject()
    } catch (error: any) {
      console.error('Failed to save settings:', error)
      setError('Failed to save project settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirm !== project?.name) {
      setError('Project name confirmation does not match')
      return
    }

    try {
      await projectAPI.delete(id as string)
      router.push('/projects')
    } catch (error: any) {
      console.error('Failed to delete project:', error)
      setError('Failed to delete project')
    }
  }

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/webhooks/${id}`
    navigator.clipboard.writeText(webhookUrl)
    setSuccess('Webhook URL copied to clipboard!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const copyWebhookSecret = () => {
    if (project?.webhookSecret) {
      navigator.clipboard.writeText(project.webhookSecret)
      setSuccess('Webhook secret copied to clipboard!')
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  if (userLoading || loading) {
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

  if (!user || !project) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          {/* <h1 className="text-2xl font-bold mb-2">Project Not Found</h1> */}
          <p className="text-gray-400 mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => router.push('/projects')}
            className="bg-cyber-blue hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{`${project.name} Settings - SecureFlow AI`}</title>
        <meta name="description" content={`Settings for ${project.name} security analysis project`} />
      </Head>

      <div className="min-h-screen bg-dark-bg text-white">
        {/* Header */}
        <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/projects/${id}`)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <Shield className="w-8 h-8 text-cyber-blue" />
                <div>
                  <h1 className="text-2xl font-bold">Project Settings</h1>
                  <p className="text-gray-400">{project.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-cyber-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Status Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6"
            >
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                <p className="text-red-400">{error}</p>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 mb-6"
            >
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                <p className="text-green-400">{success}</p>
              </div>
            </motion.div>
          )}

          <div className="space-y-6">
            {/* Basic Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Basic Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Repository URL
                  </label>
                  <input
                    type="url"
                    value={formData.repositoryUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, repositoryUrl: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                    placeholder="https://gitlab.com/user/repo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <GitBranch className="w-4 h-4 inline mr-1" />
                    Default Branch
                  </label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                    placeholder="main"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Scan Frequency
                  </label>
                  <select
                    value={formData.scanFrequency}
                    onChange={(e) => setFormData(prev => ({ ...prev, scanFrequency: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                  >
                    <option value="ON_PUSH">On Every Push</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Scan Configuration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
              <h2 className="text-xl font-semibold mb-4">Scan Configuration</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Scan Types
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'SAST', label: 'Static Analysis', desc: 'Source code vulnerability scanning' },
                    { id: 'DEPENDENCY', label: 'Dependency Check', desc: 'Third-party library vulnerabilities' },
                    { id: 'SECRET', label: 'Secret Detection', desc: 'API keys and credentials scanning' }
                  ].map(scanType => (
                    <div key={scanType.id} className="bg-gray-800 rounded-lg p-4">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.scanTypes.includes(scanType.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                scanTypes: [...prev.scanTypes, scanType.id]
                              }))
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                scanTypes: prev.scanTypes.filter(t => t !== scanType.id)
                              }))
                            }
                          }}
                          className="mt-1 text-cyber-blue focus:ring-cyber-blue focus:ring-2"
                        />
                        <div>
                          <div className="font-medium text-white">{scanType.label}</div>
                          <div className="text-sm text-gray-400">{scanType.desc}</div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Settings
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Notification Email
                  </label>
                  <input
                    type="email"
                    value={formData.notificationEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, notificationEmail: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                    placeholder="notifications@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Minimum Severity for Notifications
                  </label>
                  <select
                    value={formData.notificationSettings.minSeverity}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      notificationSettings: {
                        ...prev.notificationSettings,
                        minSeverity: e.target.value as any
                      }
                    }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notificationSettings.email}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          email: e.target.checked
                        }
                      }))}
                      className="text-cyber-blue focus:ring-cyber-blue focus:ring-2"
                    />
                    <span>Email notifications</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notificationSettings.webhook}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          webhook: e.target.checked
                        }
                      }))}
                      className="text-cyber-blue focus:ring-cyber-blue focus:ring-2"
                    />
                    <span>Webhook notifications</span>
                  </label>
                </div>
              </div>
            </motion.div>

            {/* Webhook Configuration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Webhook className="w-5 h-5 mr-2" />
                Webhook Configuration
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Webhook URL
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/${id}`}
                      readOnly
                      className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-400"
                    />
                    <button
                      onClick={copyWebhookUrl}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Webhook Secret
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type={showWebhookSecret ? 'text' : 'password'}
                      value={project.webhookSecret || ''}
                      readOnly
                      className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-400"
                    />
                    <button
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors"
                    >
                      {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={copyWebhookSecret}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Use this secret to verify webhook authenticity in GitLab
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Danger Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-red-500/5 border border-red-500/50 rounded-xl p-6"
            >
              <h2 className="text-xl font-semibold mb-4 text-red-400 flex items-center">
                <Trash2 className="w-5 h-5 mr-2" />
                Danger Zone
              </h2>
              
              <div className="space-y-4">
                <p className="text-gray-300">
                  Deleting this project will permanently remove all analysis data, history, and configuration. 
                  This action cannot be undone.
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Type "{project.name}" to confirm deletion
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-red-500/50 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white"
                    placeholder={project.name}
                  />
                </div>
                
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirm !== project.name}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Project
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps(context: any) {
  const { id } = context.params;
  
  return {
    props: {
      projectId: id
    }
  };
}