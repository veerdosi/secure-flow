import Head from 'next/head'
import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  Plus,
  Search,
  Filter,
  MoreVertical,
  GitBranch,
  Clock,
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FileText
} from 'lucide-react'
import { useUser, UserProfile } from '@/components/UserProvider'
import GitLabSettings from '@/components/GitLabSettings'
import ProjectSetup from '@/components/ProjectSetup'
import { useRouter } from 'next/router'
import { projectAPI, analysisAPI } from '@/utils/api'
import { Project, SecurityAnalysis } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface ProjectWithAnalysis extends Project {
  latestAnalysis?: SecurityAnalysis;
  analysisCount?: number;
  lastScanDate?: string;
}

export default function ProjectsPage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithAnalysis[]>([])
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithAnalysis[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [error, setError] = useState('')
  const [showGitLabSettings, setShowGitLabSettings] = useState(false)
  const [triggerProjectSetup, setTriggerProjectSetup] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
      return
    }
    if (user) {
      loadProjectsWithAnalysis()
    }
  }, [user, loading, router])

  useEffect(() => {
    filterProjects()
  }, [projects, searchTerm, filterStatus])

  const loadProjectsWithAnalysis = async () => {
    setLoadingProjects(true)
    try {
      const projectsData = await projectAPI.getAll()

      // Enrich projects with latest analysis data
      const enrichedProjects = await Promise.all(
        projectsData.map(async (project: Project) => {
          try {
            const analyses = await analysisAPI.getByProject(project._id, 1)
            const latestAnalysis = analyses?.[0]

            return {
              ...project,
              latestAnalysis: latestAnalysis ? {
                id: latestAnalysis._id,
                projectId: latestAnalysis.projectId,
                commitHash: latestAnalysis.commitHash,
                timestamp: latestAnalysis.createdAt,
                securityScore: latestAnalysis.securityScore || 0,
                threatLevel: latestAnalysis.threatLevel || 'LOW',
                vulnerabilities: latestAnalysis.vulnerabilities || [],
                threatModel: latestAnalysis.threatModel || {
                  nodes: [], edges: [], attackVectors: [],
                  attackSurface: { endpoints: 0, inputPoints: 0, outputPoints: 0, externalDependencies: 0, privilegedFunctions: 0 }
                },
                aiAnalysis: latestAnalysis.aiAnalysis || '',
                remediationSteps: latestAnalysis.remediationSteps || [],
                complianceScore: latestAnalysis.complianceScore || { owasp: 0, pci: 0, sox: 0, gdpr: 0, iso27001: 0 },
                status: latestAnalysis.status,
                userId: latestAnalysis.userId || latestAnalysis.createdBy || ''
              } : undefined,
              analysisCount: analyses?.length || 0,
              lastScanDate: latestAnalysis?.createdAt || null
            }
          } catch (error) {
            console.error(`Failed to load analysis for project ${project._id}:`, error)
            return { ...project, analysisCount: 0 }
          }
        })
      )

      setProjects(enrichedProjects)
    } catch (error: any) {
      console.error('Failed to load projects:', error)
      setError('Failed to load projects. Please try again.')
    } finally {
      setLoadingProjects(false)
    }
  }

  const filterProjects = () => {
    let filtered = projects

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.repositoryUrl.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => {
        switch (filterStatus) {
          case 'critical':
            return project.latestAnalysis?.threatLevel === 'CRITICAL'
          case 'high':
            return project.latestAnalysis?.threatLevel === 'HIGH'
          case 'medium':
            return project.latestAnalysis?.threatLevel === 'MEDIUM'
          case 'low':
            return project.latestAnalysis?.threatLevel === 'LOW'
          case 'no-analysis':
            return !project.latestAnalysis
          default:
            return true
        }
      })
    }

    setFilteredProjects(filtered)
  }

  const handleGitLabConfigured = useCallback(() => {
    // Refresh projects or handle any necessary updates after GitLab configuration
    loadProjectsWithAnalysis()
    setShowGitLabSettings(false)
    // Auto-trigger project setup after GitLab is configured
    setTriggerProjectSetup(true)
  }, [])

  const handleProjectCreated = useCallback((newProject: any) => {
    // Add the new project to the list and redirect to it
    setProjects(prev => [...prev, newProject])
    setTriggerProjectSetup(false)
    router.push(`/projects/${newProject._id}`)
  }, [router])

  const getThreatLevelColor = (level?: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/50'
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/50'
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'LOW': return 'bg-green-500/20 text-green-400 border-green-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-cyber-green'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  if (loading || loadingProjects || (!user && !loading)) {
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
    return null
  }

  return (
    <>
      <Head>
        <title>Projects - SecureFlow AI</title>
      </Head>

      <div className="min-h-screen bg-dark-bg text-white">
        {/* Header */}
        <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm relative z-[10000]">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Shield className="w-8 h-8 text-cyber-blue" />
                <div>
                  <h1 className="text-2xl font-bold">SecureFlow AI</h1>
                  <p className="text-gray-400 text-sm">Security Analysis Dashboard</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <motion.button
                  onClick={() => router.push('/analysis')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View All Analyses
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

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Total Projects</p>
                  <p className="text-2xl font-bold text-white">{projects.length}</p>
                </div>
                <GitBranch className="w-8 h-8 text-cyber-blue" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Average Security Score</p>
                  <p className="text-2xl font-bold text-cyber-green">
                    {(() => {
                      const projectsWithAnalysis = projects.filter(p => p.latestAnalysis);
                      if (projectsWithAnalysis.length === 0) return 'N/A';
                      return Math.round(
                        projectsWithAnalysis.reduce((acc, p) => acc + (p.latestAnalysis?.securityScore || 0), 0) / projectsWithAnalysis.length
                      );
                    })()}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-cyber-green" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Critical Issues</p>
                  <p className="text-2xl font-bold text-red-400">
                    {projects.reduce((acc, p) =>
                      acc + (p.latestAnalysis?.vulnerabilities?.filter(v => v.severity === 'CRITICAL').length || 0), 0
                    )}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Active Scans</p>
                  <p className="text-2xl font-bold text-cyber-blue">
                    {projects.filter(p => 
                      p.latestAnalysis?.status === 'IN_PROGRESS' || 
                      p.latestAnalysis?.status === 'PENDING'
                    ).length}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-cyber-blue" />
              </div>
            </motion.div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-dark-card border border-dark-border rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-cyber-blue focus:outline-none"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-dark-card border border-dark-border rounded-lg pl-10 pr-8 py-3 text-white focus:border-cyber-blue focus:outline-none appearance-none"
              >
                <option value="all">All Projects</option>
                <option value="critical">Critical Risk</option>
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low Risk</option>
                <option value="no-analysis">No Analysis</option>
              </select>
            </div>
          </div>

          {/* Projects Grid */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6"
            >
              <p className="text-red-400">{error}</p>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => router.push(`/projects/${project._id}`)}
                className="bg-dark-card border border-dark-border rounded-xl p-6 hover:border-cyber-blue/50 transition-all cursor-pointer group"
              >
                {/* Project Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-cyber-blue transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-gray-400 text-sm truncate">{project.repositoryUrl}</p>
                  </div>
                  <MoreVertical className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Security Metrics */}
                {project.latestAnalysis ? (
                  <div className="space-y-4">
                    {/* Security Score */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Security Score</span>
                      <span className={`text-lg font-bold ${getSecurityScoreColor(project.latestAnalysis.securityScore)}`}>
                        {project.latestAnalysis.securityScore}/100
                      </span>
                    </div>

                    {/* Threat Level */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Threat Level</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getThreatLevelColor(project.latestAnalysis.threatLevel)}`}>
                        {project.latestAnalysis.threatLevel}
                      </span>
                    </div>

                    {/* Vulnerabilities */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Vulnerabilities</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-semibold">
                          {project.latestAnalysis.vulnerabilities.length}
                        </span>
                        {project.latestAnalysis.vulnerabilities.length > 0 && (
                          <TrendingUp className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                    </div>

                    {/* Last Scan */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Last scan
                      </span>
                      <span className="text-gray-400">
                        {formatDistanceToNow(new Date(project.latestAnalysis.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <AlertTriangle className="w-8 h-8 mb-2" />
                    <p className="text-sm">No analysis available</p>
                    <p className="text-xs text-gray-500">Run your first scan</p>
                  </div>
                )}

                {/* Action Arrow */}
                <div className="flex justify-end mt-4 pt-4 border-t border-gray-800">
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyber-blue group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {filteredProjects.length === 0 && !loadingProjects && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <GitBranch className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                {searchTerm || filterStatus !== 'all' ? 'No projects match your criteria' : 'No projects yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || filterStatus !== 'all'
                  ? 'Try adjusting your search or filter settings'
                  : 'Add your first project to start monitoring security'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <motion.button
                  onClick={() => setTriggerProjectSetup(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-cyber-blue hover:bg-blue-600 text-black font-semibold py-3 px-6 rounded-lg transition-colors flex items-center mx-auto"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Your First Project
                </motion.button>
              )}
            </motion.div>
          )}
        </div>

        <GitLabSettings
          isOpen={showGitLabSettings}
          onClose={() => setShowGitLabSettings(false)}
          onSuccess={handleGitLabConfigured}
          currentSettings={user?.gitlabSettings}
        />

        <ProjectSetup
            onProjectCreated={handleProjectCreated}
            isOpen={triggerProjectSetup}
            onClose={() => setTriggerProjectSetup(false)}
        />
      </div>
    </>
  )
}
