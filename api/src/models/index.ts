import mongoose from 'mongoose';
import { Schema, Document, model } from 'mongoose';

// User Schema
export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'DEVELOPER' | 'SECURITY_ANALYST' | 'VIEWER';
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
  role: {
    type: String,
    enum: ['ADMIN', 'DEVELOPER', 'SECURITY_ANALYST', 'VIEWER'],
    default: 'DEVELOPER'
  },
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
  complianceScore: any;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
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
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'],
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
}, {
  timestamps: true,
});

// Export models
export const User = model<IUser>('User', UserSchema);
export const Project = model<IProject>('Project', ProjectSchema);
export const Analysis = model<IAnalysis>('Analysis', AnalysisSchema);

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
