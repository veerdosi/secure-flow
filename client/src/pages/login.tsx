import Head from 'next/head'
import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
import { useUser } from '@/components/UserProvider'
import AuthModal from '@/components/AuthModal'
import { useRouter } from 'next/router'

export default function LoginPage() {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/projects')
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
        <title>Sign In - SecureFlow AI</title>
        <meta name="description" content="Sign in to SecureFlow AI - AI-Powered Security Analysis Platform" />
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
              <button
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>

        {/* Login Section */}
        <div className="max-w-md mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold mb-4">Welcome Back</h2>
            <p className="text-gray-400">
              Sign in to your SecureFlow AI account to continue monitoring your code security.
            </p>
          </motion.div>

          <AuthModal
            isOpen={true}
            onClose={() => router.push('/')}
            onSuccess={() => router.push('/projects')}
            defaultMode="login"
          />
        </div>
      </div>
    </>
  )
}