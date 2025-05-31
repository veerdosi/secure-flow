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

## 📊 Features Demo

### Real-Time Security Dashboard

```typescript
// Live security score updates
const [analysis, setAnalysis] = useState<SecurityAnalysis | null>(null);

useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, 'analyses', analysisId),
    (doc) => setAnalysis(doc.data())
  );
  return unsubscribe;
}, [analysisId]);
```

### AI-Powered Vulnerability Detection

```typescript
// Vertex AI analysis
const aiResult = await aiAnalysisService.analyzeCode(codeContent, filePath);

// Example response:
{
  "vulnerabilities": [{
    "type": "SQL_INJECTION",
    "severity": "CRITICAL",
    "line": 47,
    "description": "SQL injection in login endpoint",
    "suggestedFix": "Use parameterized queries",
    "confidence": 0.95
  }],
  "securityScore": 87,
  "threatLevel": "MEDIUM"
}
```

### GitLab Webhook Integration

```typescript
// Automatic analysis on code push
router.post('/webhooks/gitlab', async (req, res) => {
  const { object_kind, project, commits } = req.body;

  if (object_kind === 'push') {
    await triggerSecurityAnalysis(project.id, commits[0].id);
  }
});
```

## 🎨 UI Components

### Animated Security Score Ring

```tsx
<SecurityScoreRing
  score={87}
  size={120}
  animated={true}
/>
```

### 3D Threat Model Visualization

```tsx
<ThreatModelVisualization
  threatModel={analysis.threatModel}
  interactive={true}
  showAttackPaths={true}
/>
```

### Real-Time Analysis Feed

```tsx
<RealTimeAnalysisFeed
  analysis={analysis}
  showLiveUpdates={true}
  maxItems={10}
/>
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
    minSeverity: "MEDIUM"
  }
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

## 📈 Security Metrics

- **Security Score**: 0-100 based on vulnerability severity and count
- **Threat Level**: LOW, MEDIUM, HIGH, CRITICAL
- **Compliance Scores**: OWASP, PCI, SOX, GDPR percentages
- **Attack Surface**: Endpoints, input points, dependencies analyzed

## 🎯 AI Analysis Features

- **Static Code Analysis** - Pattern matching for known vulnerabilities
- **Dependency Scanning** - Check for vulnerable packages
- **Secret Detection** - Find exposed API keys and credentials
- **Threat Modeling** - Generate attack vectors and data flow analysis
- **Remediation Suggestions** - AI-generated fix recommendations

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

## 🔒 Security

- Firebase Authentication for user management
- Firestore security rules for data access control
- Webhook signature verification
- API rate limiting and validation
- Encrypted data transmission

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

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🎪 Hackathon Demo

This project was built for a hackathon to demonstrate:
- Real-time AI security analysis
- Interactive 3D visualizations
- Modern React/Next.js development
- Firebase/Google Cloud integration
- GitLab API integration

### Demo Flow

1. **Setup** (30s) - Dashboard loads with smooth animations
2. **Trigger** (30s) - GitLab push triggers webhook, analysis begins
3. **Analysis** (60s) - Live feed shows AI findings, 3D model updates
4. **Results** - Security score, vulnerabilities, and remediation steps

---

**Built with ❤️ for hackathon demo - SecureFlow AI makes security analysis beautiful and actionable**
