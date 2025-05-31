import Head from 'next/head'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  return (
    <>
      <Head>
        <title>SecureFlow AI - Security Analysis Dashboard</title>
        <meta name="description" content="Real-time AI-powered security analysis for your GitLab projects" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Dashboard projectId="webapp-api" />
    </>
  )
}
