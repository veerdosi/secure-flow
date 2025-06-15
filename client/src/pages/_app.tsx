import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { UserProvider } from '@/components/UserProvider'
import { SWRConfig } from 'swr'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SWRConfig
      value={{
        refreshInterval: 0, // Disable global refresh
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
        onError: (error) => {
          // Global error handler - silently log errors
          console.warn('SWR Error:', error?.message || 'Unknown error')
        },
        onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
          // Don't retry on 4xx errors
          if (error.status >= 400 && error.status < 500) return
          // Don't retry if retryCount is more than 3
          if (retryCount >= 3) return
          // Retry after 5 seconds
          setTimeout(() => revalidate({ retryCount }), 5000)
        }
      }}
    >
      <UserProvider>
        <Component {...pageProps} />
      </UserProvider>
    </SWRConfig>
  )
}
