import Head from 'next/head'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, GitBranch, Zap, Eye, TrendingUp, AlertTriangle, Lock, Code, CheckCircle } from 'lucide-react'
import { useUser } from '@/components/UserProvider'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function Home() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [animationComplete, setAnimationComplete] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
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

  if (user) {
    return null // Router will redirect
  }

  return (
    <>
      <Head>
        <title>SecureFlow AI - AI-Powered Security Analysis Platform</title>
        <meta name="description" content="Real-time AI-powered security analysis for your GitLab projects with interactive 3D threat models" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-dark-bg text-white relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ 
              x: [-100, 100, -100],
              y: [-50, 50, -50]
            }}
            transition={{ 
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute w-96 h-96 bg-cyber-blue/5 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              x: [100, -100, 100],
              y: [50, -50, 50]
            }}
            transition={{ 
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute right-0 top-1/3 w-72 h-72 bg-cyber-green/5 rounded-full blur-3xl"
          />
        </div>

        {/* Header */}
        <div className="relative z-10 border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-4"
              >
                <div className="relative">
                  <Shield className="w-8 h-8 text-cyber-blue" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 w-8 h-8 text-cyber-blue/30"
                  >
                    <Shield className="w-8 h-8" />
                  </motion.div>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  SecureFlow AI
                </h1>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-4"
              >
                <Link href="/login">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-gray-400 hover:text-white font-semibold py-2 px-4 rounded-lg transition-colors border border-gray-600 hover:border-gray-400"
                  >
                    Sign In
                  </motion.button>
                </Link>
                <Link href="/sign-up">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gradient-to-r from-cyber-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-all shadow-lg shadow-cyber-blue/25"
                  >
                    Start Free
                  </motion.button>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-block mb-6"
              >
                <div className="bg-gradient-to-r from-cyber-blue/20 to-cyber-green/20 rounded-full p-4 backdrop-blur-sm border border-cyber-blue/30">
                  <Shield className="w-16 h-16 text-cyber-blue" />
                </div>
              </motion.div>
              
              <h2 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
                Secure Your Code with{' '}
                <span className="bg-gradient-to-r from-cyber-blue via-purple-400 to-cyber-green bg-clip-text text-transparent">
                  AI Power
                </span>
              </h2>
              <p className="text-xl md:text-2xl text-gray-400 max-w-4xl mx-auto leading-relaxed">
                Real-time security analysis, AI-powered threat detection, and interactive 3D visualizations
                for your GitLab projects. Get actionable insights and automated remediation suggestions.
              </p>
            </motion.div>

            {/* Demo Preview */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mb-12 relative"
            >
              <div className="bg-dark-card/80 border border-dark-border rounded-2xl p-8 backdrop-blur-sm shadow-2xl max-w-4xl mx-auto">
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center"
                  >
                    <div className="w-16 h-16 bg-cyber-green rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl font-bold text-black">87</span>
                    </div>
                    <p className="text-sm text-gray-400">Security Score</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-center"
                  >
                    <div className="w-16 h-16 bg-cyber-orange rounded-full flex items-center justify-center mx-auto mb-3">
                      <AlertTriangle className="w-8 h-8 text-black" />
                    </div>
                    <p className="text-sm text-gray-400">Medium Risk</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center"
                  >
                    <div className="w-16 h-16 bg-cyber-blue rounded-full flex items-center justify-center mx-auto mb-3">
                      <Zap className="w-8 h-8 text-black" />
                    </div>
                    <p className="text-sm text-gray-400">Live Analysis</p>
                  </motion.div>
                </div>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-left space-y-2 font-mono text-sm"
                >
                  <div className="text-gray-300">🔍 Scanning authentication.py...</div>
                  <div className="text-red-400">⚡ CRITICAL: SQL injection detected at line 47</div>
                  <div className="text-blue-400">🧠 AI suggests: Use parameterized queries</div>
                  <div className="text-yellow-400">✨ Generating secure code alternative...</div>
                </motion.div>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
            >
              <Link href="/sign-up">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 40px rgba(0, 212, 255, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-cyber-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all shadow-lg shadow-cyber-blue/25 min-w-[200px]"
                >
                  Start Free Trial
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="border-2 border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 font-bold py-4 px-8 rounded-xl text-lg transition-all min-w-[200px]"
                >
                  Watch Demo
                </motion.button>
              </Link>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex justify-center items-center space-x-8 text-sm text-gray-500"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-cyber-green" />
                <span>Free for open source</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-cyber-green" />
                <span>Enterprise ready</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-cyber-green" />
                <span>GitLab integration</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Features Section */}
        <div className="relative z-10 bg-dark-card/30 border-t border-dark-border">
          <div className="max-w-7xl mx-auto px-6 py-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-16"
            >
              <h3 className="text-4xl font-bold mb-6">Powerful Security Features</h3>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Everything you need to secure your applications with cutting-edge AI technology
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  color: 'cyber-blue',
                  title: 'Real-time Analysis',
                  description: 'Instant security scans on every push with live progress updates and detailed insights',
                  delay: 0.1
                },
                {
                  icon: Shield,
                  color: 'cyber-green',
                  title: 'AI-Powered Detection',
                  description: 'Advanced machine learning algorithms detect vulnerabilities with 95%+ accuracy',
                  delay: 0.2
                },
                {
                  icon: Eye,
                  color: 'cyber-orange',
                  title: '3D Threat Visualization',
                  description: 'Interactive 3D models showing attack surfaces and threat vectors in your code',
                  delay: 0.3
                },
                {
                  icon: GitBranch,
                  color: 'purple-500',
                  title: 'GitLab Integration',
                  description: 'Seamless webhook integration with your GitLab projects for automated scanning',
                  delay: 0.4
                },
                {
                  icon: Code,
                  color: 'cyan-400',
                  title: 'Smart Remediation',
                  description: 'AI-generated code fixes and security recommendations with implementation guides',
                  delay: 0.5
                },
                {
                  icon: TrendingUp,
                  color: 'green-400',
                  title: 'Compliance Tracking',
                  description: 'OWASP, PCI DSS, SOX, and other compliance framework monitoring and reporting',
                  delay: 0.6
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: feature.delay }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="bg-dark-card border border-dark-border rounded-xl p-8 transition-all duration-300 hover:border-gray-500 hover:shadow-lg hover:shadow-gray-900/50"
                >
                  <div className={`w-16 h-16 bg-${feature.color}/20 rounded-xl flex items-center justify-center mx-auto mb-6`}>
                    <feature.icon className={`w-8 h-8 text-${feature.color}`} />
                  </div>
                  <h4 className="text-xl font-bold mb-4 text-center">{feature.title}</h4>
                  <p className="text-gray-400 text-center leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '99.9%', label: 'Uptime SLA' },
              { number: '<5s', label: 'Scan Speed' },
              { number: '50K+', label: 'Vulnerabilities Detected' },
              { number: '24/7', label: 'Monitoring' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-cyber-blue mb-2">{stat.number}</div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="relative z-10 bg-gradient-to-r from-dark-card to-dark-card/50 border-t border-dark-border">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Secure Your Code?
              </h3>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                Join thousands of developers using SecureFlow AI to build more secure applications
              </p>
              <Link href="/sign-up">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-cyber-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all shadow-lg shadow-cyber-blue/25"
                >
                  Get Started Free
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 border-t border-dark-border bg-dark-card/50">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <Shield className="w-6 h-6 text-cyber-blue" />
                <span className="font-semibold">SecureFlow AI</span>
              </div>
              <p className="text-gray-400 text-sm">
                © 2025 SecureFlow AI. Secure your code with confidence.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}