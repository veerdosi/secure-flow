import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <meta name="description" content="AI-powered security analysis platform for GitLab projects" />
        <link rel="icon" href="/favicon.ico" />
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </Head>
      <body className="bg-dark-bg text-white">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
