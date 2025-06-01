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
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  stage?: AnalysisStage;
  progress?: number;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  triggeredBy?: 'manual' | 'webhook' | 'scheduled';
  userId?: string;
}

export interface Vulnerability {
  id: string;
  type: VulnerabilityType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  file: string;
  line: number;
  column?: number;
  description: string;
  suggestedFix: string;
  owaspCategory: string;
  cveId?: string;
  confidence: number;
  exploitability: number;
  impact: number;
  fixComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export type VulnerabilityType =
  | 'SQL_INJECTION'
  | 'XSS'
  | 'CSRF'
  | 'INSECURE_DESERIALIZATION'
  | 'BROKEN_AUTHENTICATION'
  | 'SENSITIVE_DATA_EXPOSURE'
  | 'XML_EXTERNAL_ENTITIES'
  | 'BROKEN_ACCESS_CONTROL'
  | 'SECURITY_MISCONFIGURATION'
  | 'VULNERABLE_COMPONENTS'
  | 'INSUFFICIENT_LOGGING';

export interface ThreatModel {
  nodes: ThreatNode[];
  edges: ThreatEdge[];
  attackVectors: AttackVector[];
  attackSurface: AttackSurface;
}

export interface ThreatNode {
  id: string;
  type: 'API' | 'DATABASE' | 'AUTH_SERVICE' | 'FILE_SYSTEM' | 'EXTERNAL_SERVICE';
  label: string;
  vulnerabilities: string[];
  riskLevel: number;
  position: { x: number; y: number; z: number };
}

export interface ThreatEdge {
  source: string;
  target: string;
  dataFlow: string;
  encrypted: boolean;
  authenticated: boolean;
  riskLevel: number;
}

export interface AttackVector {
  id: string;
  name: string;
  description: string;
  likelihood: number;
  impact: number;
  mitigations: string[];
  path: string[];
}

export interface AttackSurface {
  endpoints: number;
  inputPoints: number;
  outputPoints: number;
  externalDependencies: number;
  privilegedFunctions: number;
}

export interface RemediationStep {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  effort: 'TRIVIAL' | 'MINOR' | 'MAJOR' | 'EXTENSIVE';
  category: 'CODE_CHANGE' | 'CONFIGURATION' | 'INFRASTRUCTURE' | 'PROCESS';
  files: string[];
  estimatedTime: string;
  dependencies: string[];
  autoFixAvailable: boolean;
}

export interface ComplianceScore {
  owasp: number;
  pci: number;
  sox: number;
  gdpr: number;
  iso27001: number;
}

export interface ProjectConfig {
  id: string;
  name: string;
  gitlabProjectId: string;
  repositoryUrl: string;
  branch: string;
  scanFrequency: 'ON_PUSH' | 'DAILY' | 'WEEKLY';
  notificationSettings: NotificationSettings;
  excludePaths: string[];
  scanTypes: ScanType[];
  complianceFrameworks: string[];
  lastScanDate?: string;
  webhookId?: string;
  webhookSecret?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
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

export type ScanType =
  | 'STATIC_ANALYSIS'
  | 'DEPENDENCY_SCAN'
  | 'SECRET_DETECTION'
  | 'LICENSE_COMPLIANCE'
  | 'CONTAINER_SCAN'
  | 'INFRASTRUCTURE_SCAN';

export interface AnalysisProgress {
  stage: AnalysisStage;
  progress: number;
  message: string;
  startTime: string;
  estimatedCompletion?: string;
}

export type AnalysisStage =
  | 'INITIALIZING'
  | 'FETCHING_CODE'
  | 'STATIC_ANALYSIS'
  | 'AI_ANALYSIS'
  | 'THREAT_MODELING'
  | 'GENERATING_REPORT'
  | 'COMPLETED'
  | 'FAILED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'DEVELOPER' | 'SECURITY_ANALYST' | 'VIEWER';
  projects: string[];
  preferences: UserPreferences;
  lastLogin: string;
  createdAt?: string;
  getIdToken?: () => Promise<string>;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoRefresh: boolean;
  dashboardLayout: 'compact' | 'detailed';
  defaultTimeRange: '1h' | '24h' | '7d' | '30d';
}
