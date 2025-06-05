import Head from 'next/head'
import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, GitBranch, Zap } from 'lucide-react'
import { useUser } from '@/components/UserProvider'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function Home() {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

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
        <meta name="description" content="Real-time AI-powered security analysis for your GitLab projects" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className="min-h-screen bg-dark-bg text-white">
        {/* Header */}
        <div className="border-b border-dark-border bg-dark-card/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Shield className="w-8 h-8 text-cyber-blue" />
                <h1 className="text-2xl font-bold">SecureFlow AI</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-gray-400 hover:text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Sign In
                  </motion.button>
                </Link>
                <Link href="/sign-up">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-cyber-blue hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                  >
                    Sign Up
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h2 className="text-5xl font-bold mb-6">
                🛡️ Secure Your Code with <span className="text-cyber-blue">AI</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Real-time security analysis, AI-powered threat detection, and interactive 3D visualizations
                for your GitLab projects. Get actionable insights and automated remediation suggestions.
              </p>
            </motion.div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <Zap className="w-12 h-12 text-cyber-blue mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Real-time Analysis</h3>
                <p className="text-gray-400">Instant security scans on every push with live progress updates</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <Shield className="w-12 h-12 text-cyber-green mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">AI Insights</h3>
                <p className="text-gray-400">Machine learning powered vulnerability detection and remediation</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <GitBranch className="w-12 h-12 text-cyber-orange mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">3D Threat Models</h3>
                <p className="text-gray-400">Interactive visualizations of your application's security posture</p>
              </motion.div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/sign-up">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-cyber-blue hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors"
                >
                  Get Started - It's Free!
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 font-semibold py-4 px-8 rounded-lg text-lg transition-colors"
                >
                  Sign In
                </motion.button>
              </Link>
            </div>
          </div>
        </div>

        {/* Additional Features Section */}
        <div className="bg-dark-card/30 border-t border-dark-border">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold mb-4">Why Choose SecureFlow AI?</h3>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Our platform combines cutting-edge AI technology with practical security insights 
                to help you build more secure applications.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-cyber-blue/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h4 className="font-semibold mb-2">Lightning Fast</h4>
                <p className="text-sm text-gray-400">Get results in seconds, not hours</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-cyber-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h4 className="font-semibold mb-2">Precise Detection</h4>
                <p className="text-sm text-gray-400">AI-powered accuracy with minimal false positives</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-cyber-orange/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔄</span>
                </div>
                <h4 className="font-semibold mb-2">Continuous Monitoring</h4>
                <p className="text-sm text-gray-400">24/7 protection for your repositories</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🚀</span>
                </div>
                <h4 className="font-semibold mb-2">Easy Integration</h4>
                <p className="text-sm text-gray-400">Connect your GitLab in minutes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-dark-border bg-dark-card/50">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
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