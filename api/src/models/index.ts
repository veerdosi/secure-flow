import mongoose from 'mongoose';
import { Schema, Document, model } from 'mongoose';

// User Schema
export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  name: string;
  projects: string[];
  googleId?: string;
  avatar?: string;
  gitlabSettings?: {
    apiToken: string;
    baseUrl: string; // e.g., 'https://gitlab.com' or self-hosted
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    autoRefresh: boolean;
    dashboardLayout: 'compact' | 'detailed';
    defaultTimeRange: '1h' | '24h' | '7d' | '30d';
  };
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  projects: [{ type: String }],
  googleId: { type: String, sparse: true },
  avatar: { type: String },
  gitlabSettings: {
    apiToken: { type: String },
    baseUrl: { type: String, default: 'https://gitlab.com' }
  },
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
    notifications: { type: Boolean, default: true },
    autoRefresh: { type: Boolean, default: true },
    dashboardLayout: { type: String, enum: ['compact', 'detailed'], default: 'detailed' },
    defaultTimeRange: { type: String, enum: ['1h', '24h', '7d', '30d'], default: '24h' }
  },
  lastLogin: { type: Date },
}, {
  timestamps: true,
});

// Project Schema
export interface IProject extends Document {
  _id: string;
  name: string;
  gitlabProjectId: string;
  repositoryUrl: string;
  branch: string;
  scanFrequency: 'ON_PUSH' | 'DAILY' | 'WEEKLY';
  notificationSettings: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
    emailAddresses: string[];
    slackChannel?: string;
    webhookUrl?: string;
    minSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  excludePaths: string[];
  scanTypes: string[];
  complianceFrameworks: string[];
  webhookSecret: string;
  webhookId?: string;
  lastScanDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  gitlabProjectId: { type: String, required: true, unique: true },
  repositoryUrl: { type: String, required: true },
  branch: { type: String, default: 'main' },
  scanFrequency: {
    type: String,
    enum: ['ON_PUSH', 'DAILY', 'WEEKLY'],
    default: 'ON_PUSH'
  },
  notificationSettings: {
    email: { type: Boolean, default: true },
    slack: { type: Boolean, default: false },
    webhook: { type: Boolean, default: false },
    emailAddresses: [{ type: String }],
    slackChannel: { type: String },
    webhookUrl: { type: String },
    minSeverity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    }
  },
  excludePaths: [{ type: String }],
  scanTypes: [{ type: String }],
  complianceFrameworks: [{ type: String }],
  webhookSecret: { type: String, required: true },
  webhookId: { type: String },
  lastScanDate: { type: Date },
  createdBy: { type: String, required: true, ref: 'User' },
}, {
  timestamps: true,
});

// Analysis History Item for tracking changes
export interface IAnalysisHistoryItem {
  timestamp: Date;
  securityScore: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilityCount: number;
  newVulnerabilities: number;
  resolvedVulnerabilities: number;
  commitHash: string;
  triggeredBy: 'manual' | 'webhook' | 'scheduled';
}

// Remediation Action Interface
export interface IRemediationAction {
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
  confidence: number; // 0-100
}

// Human Approval Interface
export interface IHumanApproval {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  approvedActions: string[]; // array of remediation action IDs
  rejectedActions: string[]; // array of remediation action IDs
  comments?: string;
}

// Analysis Schema
export interface IAnalysis extends Document {
  _id: string;
  projectId: string;
  commitHash: string;
  securityScore: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilities: any[];
  threatModel: any;
  aiAnalysis: string;
  remediationSteps: any[];
  // Enhanced remediation with human approval
  proposedRemediations: IRemediationAction[];
  humanApproval: IHumanApproval;
  autoRemediationEnabled: boolean;
  complianceScore: any;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'AWAITING_APPROVAL';
  stage?: string;
  progress?: number;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  triggeredBy?: 'manual' | 'webhook' | 'scheduled';
  userId: string;
  changedFiles?: string[];
  commitMessage?: string;
  author?: any;
  error?: string;
  // Analysis History - stores trends over time
  history: IAnalysisHistoryItem[];
  // Previous analysis ID for comparison
  previousAnalysisId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisSchema = new Schema<IAnalysis>({
  projectId: { type: String, required: true, ref: 'Project' },
  commitHash: { type: String, required: true },
  securityScore: { type: Number, default: 0 },
  threatLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },
  vulnerabilities: [{ type: Schema.Types.Mixed }],
  threatModel: { type: Schema.Types.Mixed },
  aiAnalysis: { type: String, default: '' },
  remediationSteps: [{ type: Schema.Types.Mixed }],
  complianceScore: { type: Schema.Types.Mixed },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'AWAITING_APPROVAL'],
    default: 'PENDING'
  },
  stage: { type: String },
  progress: { type: Number, default: 0 },
  startedAt: { type: Date },
  completedAt: { type: Date },
  failedAt: { type: Date },
  triggeredBy: {
    type: String,
    enum: ['manual', 'webhook', 'scheduled'],
    default: 'manual'
  },
  userId: { type: String, required: true, ref: 'User' },
  changedFiles: [{ type: String }],
  commitMessage: { type: String },
  author: { type: Schema.Types.Mixed },
  error: { type: String },
  // Enhanced remediation system
  proposedRemediations: [{
    id: { type: String, required: true },
    type: { type: String, enum: ['CODE_FIX', 'DEPENDENCY_UPDATE', 'CONFIG_CHANGE', 'SECURITY_PATCH'], required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    file: { type: String, required: true },
    lineNumber: { type: Number },
    originalCode: { type: String },
    proposedCode: { type: String },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
    automated: { type: Boolean, default: false },
    estimatedRisk: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    confidence: { type: Number, min: 0, max: 100, default: 70 }
  }],
  humanApproval: {
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    approvedBy: { type: String, ref: 'User' },
    approvedAt: { type: Date },
    rejectedBy: { type: String, ref: 'User' },
    rejectedAt: { type: Date },
    approvedActions: [{ type: String }],
    rejectedActions: [{ type: String }],
    comments: { type: String }
  },
  autoRemediationEnabled: { type: Boolean, default: false },
  // Analysis history for trends
  history: [{
    timestamp: { type: Date, default: Date.now },
    securityScore: { type: Number },
    threatLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    vulnerabilityCount: { type: Number },
    newVulnerabilities: { type: Number, default: 0 },
    resolvedVulnerabilities: { type: Number, default: 0 },
    commitHash: { type: String },
    triggeredBy: { type: String, enum: ['manual', 'webhook', 'scheduled'] }
  }],
  previousAnalysisId: { type: String, ref: 'Analysis' },
}, {
  timestamps: true,
});

// Notification Schema
export interface INotification extends Document {
  _id: string;
  userId: string;
  projectId?: string;
  analysisId?: string;
  type: 'ANALYSIS_STARTED' | 'ANALYSIS_COMPLETED' | 'ANALYSIS_FAILED' | 'PROJECT_CREATED' | 'WEBHOOK_RECEIVED';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: Date;
  readAt?: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: String, required: true, ref: 'User' },
  projectId: { type: String, ref: 'Project' },
  analysisId: { type: String, ref: 'Analysis' },
  type: {
    type: String,
    enum: ['ANALYSIS_STARTED', 'ANALYSIS_COMPLETED', 'ANALYSIS_FAILED', 'PROJECT_CREATED', 'WEBHOOK_RECEIVED'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  read: { type: Boolean, default: false },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  readAt: { type: Date }
}, {
  timestamps: true,
});

// Index for efficient querying
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Export models
export const User = model<IUser>('User', UserSchema);
export const Project = model<IProject>('Project', ProjectSchema);
export const Analysis = model<IAnalysis>('Analysis', AnalysisSchema);
export const Notification = model<INotification>('Notification', NotificationSchema);

// Database connection with serverless optimization
let cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = {
  conn: null,
  promise: null,
};

export const connectDB = async (): Promise<typeof mongoose> => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Reduced from default 30s
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10, // Connection pool size
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
    console.log(`✅ MongoDB Connected: ${cached.conn.connection.host}`);
    return cached.conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    cached.promise = null; // Reset promise on error
    throw error;
  }
};

export default mongoose;
