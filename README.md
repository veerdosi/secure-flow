# SecureFlow AI 🛡️

**Real-time AI-powered security analysis platform for GitLab projects**

![SecureFlow AI Dashboard](https://via.placeholder.com/800x400/0a0a0b/39ff14?text=SecureFlow+AI+Dashboard)

## 🚀 Overview

SecureFlow AI continuously monitors your GitLab projects for security vulnerabilities using advanced AI analysis. Get real-time threat detection, interactive 3D threat models, and automated remediation suggestions.

### ✨ Key Features

- **🤖 AI-Powered Analysis** - Vertex AI analyzes code for security vulnerabilities
- **⚡ Real-Time Monitoring** - GitLab webhooks trigger instant analysis on code pushes
- **🎯 Interactive 3D Threat Models** - Visualize attack surfaces and data flows
- **📊 Live Security Dashboard** - Real-time scores, threat levels, and vulnerability feeds
- **🔧 Automated Remediation** - AI-generated fix suggestions with code examples
- **📈 Compliance Tracking** - OWASP, PCI, SOX, GDPR compliance scoring
- **🎨 Cyber-themed UI** - Dark mode with animated security visualizations

## 🏗️ Architecture

```
GitLab Webhook → Cloud Function → Vertex AI → Firestore → React Dashboard
      ↓              ↓              ↓           ↓            ↓
  Code Push  →  AI Analysis  →  Results  →  Storage  →  Visualization
```

## 🛠️ Tech Stack

### Frontend

- **Next.js 14** - React framework with app router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling with cyber theme
- **Framer Motion** - Smooth animations and transitions
- **Three.js** - 3D threat model visualizations
- **Recharts** - Security metrics and charts

### Backend

- **Node.js/Express** - REST API server
- **Firebase Firestore** - Real-time database
- **Google Vertex AI** - AI-powered code analysis
- **GitLab API** - Repository integration

### Infrastructure

- **Google Cloud Functions** - Serverless webhook processing
- **Firebase Hosting** - Static site deployment
- **Firebase Authentication** - User management

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase CLI
- Google Cloud Project with Vertex AI enabled
- GitLab API token

### 1. Clone & Install

```bash
git clone <repository-url>
cd secure-flow
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key

# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
VERTEX_AI_LOCATION=us-central1

# GitLab
GITLAB_API_TOKEN=your-gitlab-token
GITLAB_WEBHOOK_SECRET=your-webhook-secret
```

### 3. Firebase Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Deploy Firestore rules and indexes
firebase deploy --only firestore
```

### 4. Development

```bash
# Start all services
npm run dev

# Or start individually:
npm run dev:client  # Frontend (port 3000)
npm run dev:api     # Backend API (port 3001)
```

### 5. Deploy

```bash
# Build and deploy client
npm run build:client
firebase deploy --only hosting

# Deploy cloud functions
cd cloud-functions/webhook-handler
npm run deploy
```

## 🔧 Configuration

### Project Setup

```typescript
// Configure GitLab project for monitoring
const projectConfig = {
  gitlabProjectId: "12345",
  scanFrequency: "ON_PUSH",
  scanTypes: ["STATIC_ANALYSIS", "DEPENDENCY_SCAN"],
  notificationSettings: {
    email: true,
    minSeverity: "MEDIUM",
  },
};
```

### Webhook Configuration

```bash
# GitLab webhook URL
https://your-domain.com/api/webhooks/gitlab

# Required events:
- Push events
- Merge request events

# Secret token: Set in environment variables
```

## 🚀 Deployment Options

### Firebase Hosting (Recommended)

```bash
npm run build
firebase deploy
```

### Manual Deployment

```bash
# Build client
cd client && npm run build

# Deploy to your hosting provider
# Upload client/out/ directory
```

## 📝 API Documentation

### Start Analysis

```bash
POST /api/analysis/start
{
  "projectId": "12345",
  "commitHash": "abc123",
  "scanTypes": ["STATIC_ANALYSIS"]
}
```

### Get Analysis Results

```bash
GET /api/analysis/{analysisId}
```

### Project Configuration

```bash
POST /api/projects
{
  "name": "My Project",
  "gitlabProjectId": "12345",
  "scanFrequency": "ON_PUSH"
}
```
