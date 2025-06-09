import Head from 'next/head'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/router'
import { 
  Shield, 
  ArrowLeft, 
  Clock, 
  GitCommit, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Play,
  Pause,
  MoreVertical,
  Download,
  Eye,
  Calendar,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Bug,
  AlertCircle,
  Activity
} from 'lucide-react'
import { useUser } from '@/components/UserProvider'
import { projectAPI, analysisAPI } from '@/utils/api'
import { Project } from '@/types'

interface AnalysisRun {
  _id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  triggeredBy: 'manual' | 'webhook' | 'scheduled'
  commitHash?: string
  commitMessage?: string
  author?: string
  createdAt: string
  completedAt?: string
  duration?: number
  vulnerabilities?: {
    critical: number
    high: number
    medium: number
    low: number
    total: number
  }
  scanTypes: string[]
  branch: string
}

export default function ProjectHistoryPage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const { id } = router.query

  const [project, setProject] = useState<Project | null>(null)
  const [analyses, setAnalyses] = useState<AnalysisRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null)

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
      return
    }
    if (id && user) {
      loadProject()
      loadAnalysisHistory()
    }
  }, [id, user, userLoading, router])

  const loadProject = async () => {
    try {
      const projectData = await projectAPI.getById(id as string)
      setProject(projectData)
    } catch (error: any) {
      console.error('Failed to load project:', error)
      setError('Failed to load project information')
    }
  }

  const loadAnalysisHistory = async () => {
    try {
      setLoading(true)
      const analysisData = await analysisAPI.getByProject(id as string, 50)
      setAnalyses(analysisData)
    } catch (error: any) {
      console.error('Failed to load analysis history:', error)
      setError('Failed to load analysis history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'RUNNING':
        return <Play className="w-5 h-5 text-blue-400" />
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-400" />
      case 'CANCELLED':
        return <Pause className="w-5 h-5 text-gray-400" />
      default:
        return <AlertTriangle className="w-5 h-5 text-orange-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-400 bg-green-400/10 border-green-400/50'
      case 'FAILED':
        return 'text-red-400 bg-red-400/10 border-red-400/50'
      case 'RUNNING':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/50'
      case 'PENDING':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/50'
      case 'CANCELLED':
        return 'text-gray-400 bg-gray-400/10 border-gray-400/50'
      default:
        return 'text-orange-400 bg-orange-400/10 border-orange-400/50'
    }
  }

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'webhook':
        return <GitCommit className="w-4 h-4" />
      case 'manual':
        return <User className="w-4 h-4" />
      case 'scheduled':
        return <Calendar className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A'
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}m ${seconds}s`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const filteredAnalyses = analyses.filter(analysis => {
    const matchesStatus = selectedStatus === 'all' || analysis.status === selectedStatus
    const matchesSearch = searchTerm === '' || 
      analysis.commitMessage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.commitHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.author?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500'
      case 'high':
        return 'text-orange-500'
      case 'medium':
        return 'text-yellow-500'
      case 'low':
        return 'text-blue-500'
      default:
        return 'text-gray-400'
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
        <title>{`${project.name} History - SecureFlow AI`}</title>
        <meta name="description" content={`Analysis history for ${project.name} security scans`} />
      </Head>

      <div className="min-h-screen bg-dark-bg text-white">
        {/* Header */}
        <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/projects=${id}`)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <Shield className="w-8 h-8 text-cyber-blue" />
                <div>
                  <h1 className="text-2xl font-bold">Analysis History</h1>
                  <p className="text-gray-400">{project.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/project/${id}/settings`)}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-dark-card border border-dark-border rounded-xl p-6 mb-6"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by commit, author, or message..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white w-64"
                  />
                </div>
                
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyber-blue focus:border-transparent text-white"
                >
                  <option value="all">All Status</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="RUNNING">Running</option>
                  <option value="FAILED">Failed</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="text-sm text-gray-400">
                {filteredAnalyses.length} of {analyses.length} analyses
              </div>
            </div>
          </motion.div>

          {/* Error State */}
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

          {/* Analysis List */}
          <div className="space-y-4">
            {filteredAnalyses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-dark-card border border-dark-border rounded-xl p-12 text-center"
              >
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Analysis History</h3>
                <p className="text-gray-400">
                  {searchTerm || selectedStatus !== 'all' 
                    ? 'No analyses match your current filters.' 
                    : 'No security analyses have been run for this project yet.'}
                </p>
              </motion.div>
            ) : (
              filteredAnalyses.map((analysis, index) => (
                <motion.div
                  key={analysis._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-dark-card border border-dark-border rounded-xl overflow-hidden"
                >
                  <div 
                    className="p-6 cursor-pointer hover:bg-gray-800/50 transition-colors"
                    onClick={() => setExpandedAnalysis(expandedAnalysis === analysis._id ? null : analysis._id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {expandedAnalysis === analysis._id ? 
                            <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          }
                          {getStatusIcon(analysis.status)}
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-3">
                            <span className="font-medium">
                              {analysis.commitMessage || 'No commit message'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(analysis.status)}`}>
                              {analysis.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                            <div className="flex items-center space-x-1">
                              {getTriggerIcon(analysis.triggeredBy)}
                              <span className="capitalize">{analysis.triggeredBy}</span>
                            </div>
                            
                            {analysis.commitHash && (
                              <div className="flex items-center space-x-1">
                                <GitCommit className="w-4 h-4" />
                                <span className="font-mono">{analysis.commitHash.substring(0, 8)}</span>
                              </div>
                            )}
                            
                            {analysis.author && (
                              <div className="flex items-center space-x-1">
                                <User className="w-4 h-4" />
                                <span>{analysis.author}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatDate(analysis.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {analysis.vulnerabilities && (
                          <div className="flex items-center space-x-2 text-sm">
                            {analysis.vulnerabilities.critical > 0 && (
                              <span className={getSeverityColor('critical')}>
                                {analysis.vulnerabilities.critical} Critical
                              </span>
                            )}
                            {analysis.vulnerabilities.high > 0 && (
                              <span className={getSeverityColor('high')}>
                                {analysis.vulnerabilities.high} High
                              </span>
                            )}
                            {analysis.vulnerabilities.medium > 0 && (
                              <span className={getSeverityColor('medium')}>
                                {analysis.vulnerabilities.medium} Medium
                              </span>
                            )}
                            {analysis.vulnerabilities.low > 0 && (
                              <span className={getSeverityColor('low')}>
                                {analysis.vulnerabilities.low} Low
                              </span>
                            )}
                            {analysis.vulnerabilities.total === 0 && (
                              <span className="text-green-400">No issues</span>
                            )}
                          </div>
                        )}
                        
                        {analysis.duration && (
                          <span className="text-sm text-gray-400">
                            {formatDuration(analysis.duration)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedAnalysis === analysis._id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-700 p-6 bg-gray-800/50"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                          <h4 className="font-medium mb-2">Scan Details</h4>
                          <div className="space-y-2 text-sm text-gray-400">
                            <div>Branch: <span className="text-white">{analysis.branch}</span></div>
                            <div>Scan Types: <span className="text-white">{analysis.scanTypes.join(', ')}</span></div>
                            {analysis.completedAt && (
                              <div>Completed: <span className="text-white">{formatDate(analysis.completedAt)}</span></div>
                            )}
                          </div>
                        </div>

                        {analysis.vulnerabilities && (
                          <div>
                            <h4 className="font-medium mb-2">Vulnerability Summary</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className={getSeverityColor('critical')}>Critical:</span>
                                <span className="text-white">{analysis.vulnerabilities.critical}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className={getSeverityColor('high')}>High:</span>
                                <span className="text-white">{analysis.vulnerabilities.high}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className={getSeverityColor('medium')}>Medium:</span>
                                <span className="text-white">{analysis.vulnerabilities.medium}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className={getSeverityColor('low')}>Low:</span>
                                <span className="text-white">{analysis.vulnerabilities.low}</span>
                              </div>
                              <div className="flex justify-between border-t border-gray-600 pt-2">
                                <span className="text-white font-medium">Total:</span>
                                <span className="text-white font-medium">{analysis.vulnerabilities.total}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="font-medium mb-2">Actions</h4>
                          <div className="space-y-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/analysis/${analysis._id}`)
                              }}
                              className="w-full bg-cyber-blue hover:bg-blue-600 text-white text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </button>
                            
                            {analysis.status === 'COMPLETED' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Implement download report functionality
                                }}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Report
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))
            )}
          </div>

          {/* Load More */}
          {filteredAnalyses.length > 0 && filteredAnalyses.length < analyses.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-8"
            >
              <button
                onClick={() => loadAnalysisHistory()}
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Load More
              </button>
            </motion.div>
          )}
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