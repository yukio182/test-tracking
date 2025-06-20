'use client'

import { useEffect } from 'react'

interface VisitorTrackerProps {
  enabled?: boolean
}

export default function VisitorTracker({ enabled = true }: VisitorTrackerProps) {
  useEffect(() => {
    if (!enabled) return

    // Kiểm tra xem trang có phải là demo page không (để tránh double tracking)
    if (window.location.pathname === '/') {
      console.log('🔍 VISITOR TRACKER: Skipping auto-track on demo page to avoid double tracking')
      return
    }

    const trackVisitor = async () => {
      try {
        console.log('🔍 VISITOR TRACKER: Starting automatic tracking...')
        
        // Parse User-Agent để lấy thông tin device, OS, browser
        const deviceInfo = parseUserAgent(navigator.userAgent)
        console.log('🔍 VISITOR TRACKER: Device info detected:', deviceInfo)
        
        const visitorData = {
          hostname: window.location.hostname,
          path: window.location.pathname,
          referrer: document.referrer || '',
          device: deviceInfo.device,
          os: deviceInfo.os,
          browser: deviceInfo.browser,
          screenResolution: `${screen.width}x${screen.height}`,
          language: navigator.language || '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
        }

        console.log('🔍 VISITOR TRACKER: Sending data to API...', visitorData)

        // Gửi data đến API route
        const response = await fetch('/api/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(visitorData)
        })

        if (response.ok) {
          console.log('🔍 VISITOR TRACKER: ✅ Visitor tracked successfully!')
        } else {
          console.error('🔍 VISITOR TRACKER: ❌ API response error:', response.status)
        }
      } catch (error) {
        console.error('🔍 VISITOR TRACKER: 🚨 Failed to track visitor:', error)
      }
    }

    // Track ngay khi component mount
    trackVisitor()
  }, [enabled])

  return null // Component này không render gì
}

function parseUserAgent(userAgent: string) {
  // Detect device type
  const device = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) 
    ? 'Mobile' : 'Desktop'
  
  // Detect OS
  let os = 'Unknown'
  if (/Windows NT/.test(userAgent)) os = 'Windows'
  else if (/Mac OS X/.test(userAgent)) os = 'macOS'
  else if (/Android/.test(userAgent)) os = 'Android'
  else if (/iPhone|iPad/.test(userAgent)) os = 'iOS'
  else if (/Linux/.test(userAgent)) os = 'Linux'
  else if (/CrOS/.test(userAgent)) os = 'Chrome OS'
  
  // Detect browser
  let browser = 'Unknown'
  if (/Chrome/.test(userAgent) && !/Edge|Edg/.test(userAgent) && !/OPR/.test(userAgent)) {
    browser = 'Chrome'
  } else if (/Firefox/.test(userAgent)) {
    browser = 'Firefox'
  } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
    browser = 'Safari'
  } else if (/Edge|Edg/.test(userAgent)) {
    browser = 'Edge'
  } else if (/OPR/.test(userAgent)) {
    browser = 'Opera'
  }
  
  return { device, os, browser }
} 