'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scalar auto-initializes when the script loads and finds the element with data-url
  }, [])

  return (
    <div className="h-full w-full" ref={containerRef}>
      <div
        id="api-reference"
        data-url="/api/openapi"
        data-theme="kepler"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.min.js"
        strategy="afterInteractive"
      />
      <style jsx global>{`
        #api-reference {
          height: 100%;
        }
      `}</style>
    </div>
  )
}
