// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  projects: string[];
  preferences: UserPreferences;
  gitlabSettings?: GitLabSettings;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoRefresh: boolean;
  dashboardLayout: 'compact' | 'detailed';
  defaultTimeRange: '1h' | '24h' | '7d' | '30d';
}

export interface GitLabSettings {
  apiToken: string;
  baseUrl: string;
}

// Project Types
export interface Project {
  _id: string;
  name: string;
  gitlabProjectId: string;
  repositoryUrl: string;
  branch: string;
  scanFrequency: 'ON_PUSH' | 'DAILY' | 'WEEKLY';
  notificationSettings: NotificationSettings;
  excludePaths: string[];
  scanTypes: string[];
  complianceFrameworks: string[];
  webhookSecret: string;
  webhookId?: string;
  lastScanDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  email: boolean;
  slack: boolean;
  webhook: boolean;
  emailAddresses: string[];
  slackChannel?: string;
  webhookUrl?: string;
  minSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// Analysis Types
export interface SecurityAnalysis {
  id: string;
  projectId: string;
  commitHash: string;
  timestamp: string;
  securityScore: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilities: Vulnerability[];
  threatModel: ThreatModel;
  aiAnalysis: string;
  remediationSteps: RemediationStep[];
  complianceScore: ComplianceScore;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'AWAITING_APPROVAL';
  stage?: string;
  progress?: number;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  triggeredBy?: 'manual' | 'webhook' | 'scheduled';
  userId: string;
  changedFiles?: string[];
  commitMessage?: string;
  author?: GitAuthor;
  error?: string;
  // Human-in-the-Loop fields
  proposedRemediations?: RemediationAction[];
  humanApproval?: HumanApproval;
  autoRemediationEnabled?: boolean;
}

export interface RemediationAction {
  id: string;
  type: 'CODE_FIX' | 'DEPENDENCY_UPDATE' | 'CONFIG_CHANGE' | 'SECURITY_PATCH';
  title: string;
  description: string;
  file: string;
  lineNumber?: number;
  originalCode?: string;
  proposedCode?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  automated: boolean;
  estimatedRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
}

export interface HumanApproval {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  approvedActions: string[];
  rejectedActions: string[];
  comments?: string;
}

export interface Vulnerability {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  file: string;
  line?: number;
  column?: number;
  description: string;
  suggestedFix: string;
  owaspCategory?: string;
  cweId?: string;
  confidence: number;
  exploitability: number;
  impact: number;
  references?: string[];
  codeSnippet?: string;
  fixedCode?: string;
}

export interface ThreatModel {
  nodes: ThreatNode[];
  edges: ThreatEdge[];
  attackVectors: AttackVector[];
  attackSurface: AttackSurface;
}

export interface ThreatNode {
  id: string;
  label: string;
  type: 'service' | 'database' | 'api' | 'frontend' | 'external';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilities: string[];
  position?: { x: number; y: number; z: number };
  metadata?: Record<string, any>;
}

export interface ThreatEdge {
  id: string;
  source: string;
  target: string;
  type: 'data_flow' | 'api_call' | 'dependency' | 'trust_boundary';
  encrypted: boolean;
  authenticated: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  protocols?: string[];
  metadata?: Record<string, any>;
}

export interface AttackVector {
  id: string;
  name: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  likelihood: number;
  impact: number;
  mitigations: string[];
  affectedNodes: string[];
  killChain: string[];
}

export interface AttackSurface {
  endpoints: number;
  inputPoints: number;
  outputPoints: number;
  externalDependencies: number;
  privilegedFunctions: number;
  score: number;
}

export interface RemediationStep {
  id: string;
  vulnerabilityId: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  effort: 'EASY' | 'MEDIUM' | 'HARD';
  category: 'CODE_CHANGE' | 'CONFIGURATION' | 'INFRASTRUCTURE' | 'PROCESS';
  steps: string[];
  codeExample?: string;
  references?: string[];
  estimatedTime?: string;
  prerequisites?: string[];
}

export interface ComplianceScore {
  owasp: number;
  pci: number;
  sox: number;
  gdpr: number;
  iso27001: number;
  [key: string]: number;
}

export interface GitAuthor {
  name: string;
  email: string;
  avatar?: string;
}

// Analysis Progress Types
export interface AnalysisProgress {
  stage: 'INITIALIZING' | 'FETCHING_CODE' | 'STATIC_ANALYSIS' | 'AI_ANALYSIS' | 'THREAT_MODELING' | 'COMPLETED';
  progress: number;
  message: string;
  startTime: string;
  estimatedCompletion?: string;
  currentFile?: string;
  totalFiles?: number;
  processedFiles?: number;
}

// Real-time Feed Types
export interface AnalysisFeedItem {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
  file?: string;
  line?: number;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  icon?: string;
}

// Webhook Types
export interface WebhookEvent {
  id: string;
  projectId: string;
  eventType: 'push' | 'merge_request' | 'tag_push';
  timestamp: string;
  triggeredBy: string;
  commitHash: string;
  branch: string;
  status: 'received' | 'processing' | 'completed' | 'failed';
  analysisId?: string;
  error?: string;
  payload?: Record<string, any>;
}

// File Types
export interface ProjectFile {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilityCount?: number;
  language?: string;
  content?: string;
}

// Dashboard Types
export interface DashboardStats {
  totalProjects: number;
  totalAnalyses: number;
  averageSecurityScore: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
  recentAnalyses: SecurityAnalysis[];
  trendData: TrendDataPoint[];
}

export interface TrendDataPoint {
  date: string;
  securityScore: number;
  vulnerabilities: number;
  projects: number;
}

// System Types
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  database: string;
  services: {
    mongodb: string;
    ai: string;
  };
  details?: {
    environment: {
      mongodbUri: boolean;
      geminiApiKey: boolean;
      jwtSecret: boolean;
      clientUrl: boolean;
    };
    errors: string[];
  };
}

export interface SystemMetrics {
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  database: {
    state: number;
    name: string;
  };
  environment: string;
  timestamp: string;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Error Types
export interface APIError {
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, any>;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ProjectForm {
  name: string;
  gitlabProjectId: string;
  repositoryUrl: string;
  branch: string;
  scanFrequency: 'ON_PUSH' | 'DAILY' | 'WEEKLY';
  notificationEmail: string;
  scanTypes: string[];
  webhookSecret: string;
}

// Filter and Search Types
export interface VulnerabilityFilter {
  severity?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
  type?: string[];
  file?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  status?: 'open' | 'fixed' | 'ignored';
}

export interface SearchQuery {
  query: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  page?: number;
  limit?: number;
}

// Export all types for easy importing
export type {
  // Re-export common types
  User as UserType,
  Project as ProjectType,
  SecurityAnalysis as AnalysisType,
  Vulnerability as VulnerabilityType,
  ThreatModel as ThreatModelType,
};