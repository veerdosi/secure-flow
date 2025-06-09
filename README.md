# SecureFlow AI 🛡️

**Real-time AI-powered security analysis platform for GitLab projects**

![SecureFlow AI Dashboard](./secureflow-dashboard.png)

## 🚀 Overview

SecureFlow AI continuously monitors your GitLab projects for security vulnerabilities using advanced AI analysis. Get real-time threat detection, interactive 3D threat models, and automated remediation suggestions with approval workflows.

### ✨ Key Features

- **🤖 Gemini AI Analysis** - Google's Gemini Pro analyzes code for security vulnerabilities
- **⚡ Real-Time Monitoring** - GitLab webhooks trigger instant analysis on code pushes
- **🎯 Interactive 3D Threat Models** - Visualize attack surfaces and data flows with Three.js
- **📊 Live Security Dashboard** - Real-time scores, threat levels, and vulnerability feeds
- **🔧 Automated Remediation** - AI-generated fix suggestions with approval workflows
- **📈 Compliance Tracking** - OWASP, PCI, SOX, GDPR compliance scoring
- **🔐 User Authentication** - Secure JWT-based auth with Google OAuth integration
- **📱 Responsive Design** - Modern Next.js frontend with Tailwind CSS and Framer Motion
- **🔔 Smart Notifications** - Email alerts for critical vulnerabilities

## 🏗️ Architecture

```
GitLab Webhook → Express API → Gemini AI → MongoDB → Next.js Dashboard
      ↓              ↓            ↓         ↓            ↓
  Code Push  →  AI Analysis  →  Results  →  Storage  →  Visualization
```

## 🛠️ Tech Stack

### Frontend

- **Next.js 14** - React framework with app router and TypeScript
- **Tailwind CSS** - Utility-first styling with cyber theme
- **Framer Motion** - Smooth animations and transitions
- **Three.js** - 3D threat model visualizations
- **Chart.js & Recharts** - Security metrics and data visualization
- **Zustand** - State management

### Backend

- **Node.js/Express** - REST API server with TypeScript
- **MongoDB/Mongoose** - NoSQL database with ODM
- **Gemini AI** - Google's generative AI for code analysis
- **GitLab API** - Repository integration and webhooks
- **JWT & bcrypt** - Authentication and password hashing
- **Nodemailer** - Email notifications
- **Node-cron** - Scheduled analysis tasks

### DevOps & Deployment

- **Vercel** - Frontend hosting with serverless functions
- **Render** - Backend API hosting
- **MongoDB Atlas** - Cloud database
- **GitHub Actions** - CI/CD pipeline

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB (local or Atlas)
- Gemini API key
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
# Database (required)
MONGODB_URI=mongodb://localhost:27017/secure-flow
# or MongoDB Atlas: mongodb+srv://user:pass@cluster.mongodb.net/secure-flow

# JWT Authentication (required)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Gemini AI (required) - Get from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSyC...your-gemini-api-key-here
GEMINI_MODEL=gemini-pro

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
CLIENT_URL=http://localhost:3000
```

**Note:** GitLab tokens are configured per-user in the app, not environment variables.

### 3. Database Setup

**Local MongoDB:**

```bash
# macOS
brew install mongodb/brew/mongodb-community
brew services start mongodb/brew/mongodb-community

# Ubuntu/Debian
sudo apt install mongodb
sudo systemctl start mongodb
```

**MongoDB Atlas (recommended):**

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create cluster and get connection string
3. Update `MONGODB_URI` in `.env`

### 4. Development

```bash
# Start both frontend and backend
npm run dev

# Or individually:
npm run dev:client  # Next.js frontend (port 3000)
npm run dev:api     # Express backend (port 3001)
```

### 5. User Setup

1. **Register**: Create account at http://localhost:3000
2. **GitLab Integration**: Profile → Settings → Add GitLab token
3. **Add Projects**: Dashboard → Add GitLab Project → Configure webhooks

## 🔧 Project Structure

```
secure-flow/
├── client/                 # Next.js frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Next.js pages
│   │   ├── hooks/         # Custom hooks
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   └── package.json
├── api/                   # Express backend
│   ├── src/
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   └── utils/         # Helper functions
│   └── package.json
├── cloud-functions/       # Serverless functions
│   └── webhook-handler/   # GitLab webhook handler
└── package.json          # Workspace root
```

## 🚀 Deployment

### Automated Deployment

The project includes deployment configurations for:

**Frontend (Vercel):**

```bash
# Vercel deployment is automatic on git push
# Configure environment variables in Vercel dashboard
```

**Backend (Render):**

```bash
# Uses render.yaml configuration
# Set environment variables in Render dashboard:
# - MONGODB_URI
# - JWT_SECRET
# - GEMINI_API_KEY
# - CORS_ORIGIN (your Vercel URL)
```

### Manual Deployment

```bash
# Build everything
npm run build

# Deploy client to Vercel
cd client && vercel deploy

# Deploy API to Render or your hosting provider
cd api && npm run build
```

## 📝 API Endpoints

### Authentication

```bash
POST /api/auth/register    # User registration
POST /api/auth/login       # User login
GET  /api/auth/me          # Get user profile
PUT  /api/auth/profile     # Update profile
```

### Projects

```bash
GET    /api/projects           # List user projects
POST   /api/projects           # Add new project
PUT    /api/projects/:id       # Update project
DELETE /api/projects/:id       # Delete project
```

### Analysis

```bash
GET  /api/analysis              # List analyses
POST /api/analysis/start        # Start new analysis
GET  /api/analysis/:id          # Get analysis details
GET  /api/analysis/:id/results  # Get analysis results
```

### Webhooks

```bash
POST /api/webhooks/gitlab      # GitLab webhook endpoint
```

### Approvals

```bash
GET  /api/approval/pending     # Get pending approvals
POST /api/approval/:id/approve # Approve remediation
POST /api/approval/:id/reject  # Reject remediation
```

## 🔐 Security Features

- **JWT Authentication** - Secure token-based auth
- **Rate Limiting** - Prevents API abuse
- **CORS Protection** - Configurable origin restrictions
- **Helmet Security** - Security headers
- **Input Validation** - Joi schema validation
- **Password Hashing** - bcrypt with configurable rounds
- **Environment Isolation** - Separate dev/prod configs

## 🧪 Testing

```bash
# Run API tests
cd api && npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📈 Monitoring & Analytics

- **Real-time Analysis** - Live vulnerability scanning
- **Scheduled Scans** - Automated periodic analysis
- **Email Notifications** - Critical vulnerability alerts
- **Compliance Tracking** - OWASP and regulatory compliance
- **Performance Metrics** - Analysis timing and success rates

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs via GitHub Issues
- **Email**: Contact team for enterprise support

---

**Built with ❤️ using Next.js, Express, MongoDB, and Gemini AI**
