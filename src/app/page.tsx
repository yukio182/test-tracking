'use client'

import Image from "next/image";
import { useEffect, useState } from "react";

interface VisitorInfo {
  timestamp: string
  hostname: string
  path: string
  referrer: string
  device: string
  os: string
  browser: string
  userAgent: string
  screenResolution: string
  language: string
  timezone: string
  cookiesEnabled: boolean
  localTime: string
}

export default function Home() {
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo | null>(null)
  const [trackingStatus, setTrackingStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [debugLogs, setDebugLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(`🔍 TRACKING DEBUG:`, logMessage)
    setDebugLogs(prev => [...prev, logMessage])
  }

  useEffect(() => {
    const gatherVisitorInfo = () => {
      addLog('🚀 Bắt đầu thu thập thông tin visitor...')

      // Parse User-Agent để lấy thông tin device, OS, browser
      const deviceInfo = parseUserAgent(navigator.userAgent)
      addLog(`📱 Device info detected: ${JSON.stringify(deviceInfo)}`)

      const info: VisitorInfo = {
        timestamp: new Date().toISOString(),
        hostname: window.location.hostname,
        path: window.location.pathname,
        referrer: document.referrer || 'Direct visit',
        device: deviceInfo.device,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        language: navigator.language || 'unknown',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
        cookiesEnabled: navigator.cookieEnabled,
        localTime: new Date().toLocaleString('vi-VN')
      }

      addLog(`✅ Thông tin visitor đã thu thập: ${JSON.stringify(info, null, 2)}`)
      setVisitorInfo(info)

      // Gửi data đến API để track
      trackVisitor(info)
    }

    const trackVisitor = async (info: VisitorInfo) => {
      try {
        addLog('📡 Đang gửi data đến API /api/track...')
        
        const response = await fetch('/api/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(info)
        })

        addLog(`📊 API Response status: ${response.status}`)

        if (response.ok) {
          const result = await response.json()
          addLog(`✅ Tracking thành công! Response: ${JSON.stringify(result)}`)
          setTrackingStatus('success')
        } else {
          const error = await response.text()
          addLog(`❌ Tracking failed! Error: ${error}`)
          setTrackingStatus('error')
        }
      } catch (error) {
        addLog(`🚨 Network error: ${error}`)
        setTrackingStatus('error')
      }
    }

    // Thu thập thông tin ngay khi component mount
    gatherVisitorInfo()
  }, [])

  // Test API endpoint manually
  const testApiEndpoint = async () => {
    addLog('🧪 Manual API test started...')
    
    const testData = {
      hostname: 'test.localhost',
      path: '/manual-test',
      referrer: 'manual-test',
      device: 'Test Device',
      os: 'Test OS',
      browser: 'Test Browser'
    }

    try {
      const response = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      })

      const result = await response.json()
      addLog(`🧪 Manual test result: ${JSON.stringify(result)}`)
      
      if (response.ok) {
        alert('✅ API test successful! Check debug console and Google Sheet.')
      } else {
        alert('❌ API test failed! Check debug console for details.')
      }
    } catch (error) {
      addLog(`🧪 Manual test error: ${error}`)
      alert('🚨 API test error! Check console.')
    }
  }

  // Test Google Sheets permission
  const testGoogleSheetsPermission = async () => {
    addLog('🔐 Testing Google Sheets API directly...')
    
    try {
      const response = await fetch('/api/debug-sheets')
      const result = await response.json()
      
      addLog(`🔐 Debug API result: ${JSON.stringify(result, null, 2)}`)
      
      if (response.ok) {
        alert('✅ Google Sheets API test successful! Check debug console.')
      } else {
        alert('❌ Google Sheets API test failed! Check debug console.')
      }
    } catch (error) {
      addLog(`🔐 Debug API error: ${error}`)
      alert('🚨 Debug API error! Check console.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center py-8">
          <Image
            className="mx-auto mb-4 dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={180}
            height={38}
            priority
          />
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            📊 TikTok Visitor Tracking Demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            🎯 Realtime visitor tracking với Google Sheets integration
          </p>
        </div>

        {/* Tracking Status */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              🔄 Tracking Status
              <span className="ml-4">
                {trackingStatus === 'loading' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    🔄 Đang tracking...
                  </span>
                )}
                {trackingStatus === 'success' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    ✅ Tracking thành công!
                  </span>
                )}
                {trackingStatus === 'error' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    ❌ Tracking lỗi
                  </span>
                )}
              </span>
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Visitor này đang được track realtime và ghi vào Google Sheet ID: 
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
                10RN0XpPpLyVmQB-sEbAgWxmyAcU2Bcwkr_k29RakGTo
              </code>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Visitor Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">👤 Thông tin Visitor</h2>
            {visitorInfo ? (
              <div className="space-y-3">
                {[
                  { label: '⏰ Timestamp', value: visitorInfo.timestamp },
                  { label: '🌐 Hostname', value: visitorInfo.hostname },
                  { label: '🛣️ Path', value: visitorInfo.path },
                  { label: '🔗 Referrer', value: visitorInfo.referrer },
                  { label: '📱 Device', value: visitorInfo.device },
                  { label: '💻 OS', value: visitorInfo.os },
                  { label: '🌐 Browser', value: visitorInfo.browser },
                  { label: '📺 Screen', value: visitorInfo.screenResolution },
                  { label: '🗣️ Language', value: visitorInfo.language },
                  { label: '🌍 Timezone', value: visitorInfo.timezone },
                  { label: '🍪 Cookies', value: visitorInfo.cookiesEnabled ? 'Enabled' : 'Disabled' },
                  { label: '🕐 Local Time', value: visitorInfo.localTime }
                ].map((item, index) => (
                  <div key={index} className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                    <span className="text-gray-600 dark:text-gray-400 max-w-xs truncate text-right">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Đang thu thập thông tin...</p>
              </div>
            )}
          </div>

          {/* Debug Console */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">🐛 Debug Console</h2>
            <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto">
              <div className="font-mono text-sm">
                {debugLogs.map((log, index) => (
                  <div key={index} className="text-green-400 mb-1">
                    {log}
                  </div>
                ))}
                {debugLogs.length === 0 && (
                  <div className="text-gray-500">Đang chờ debug logs...</div>
                )}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => setDebugLogs([])}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                🗑️ Clear Logs
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                🔄 Reload & Test Again
              </button>
            </div>
          </div>
        </div>

        {/* User Agent Details */}
        {visitorInfo && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">🕵️ User Agent Analysis</h2>
            <div className="bg-gray-100 dark:bg-gray-700 rounded p-4">
              <p className="font-mono text-sm break-all">{visitorInfo.userAgent}</p>
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p>💡 User Agent này sẽ được gửi đến Google Sheets cùng với các thông tin khác để tracking.</p>
              <p>🔍 Bạn có thể kiểm tra console.log để xem chi tiết quá trình tracking.</p>
            </div>
          </div>
        )}

                 {/* Google Sheets Debug Section */}
         <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
           <h2 className="text-2xl font-semibold mb-4">📊 Google Sheets Integration</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <h3 className="text-lg font-medium mb-2">🔗 Direct Links</h3>
               <div className="space-y-2">
                 <a
                   href="https://docs.google.com/spreadsheets/d/10RN0XpPpLyVmQB-sEbAgWxmyAcU2Bcwkr_k29RakGTo/edit"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="block w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-center"
                 >
                   📊 Open Google Sheet (View Data)
                 </a>
                 <a
                   href="https://console.cloud.google.com/apis/credentials?project=testtrackingdns"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="block w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-center"
                 >
                   🔑 Google Cloud Console
                 </a>
               </div>
             </div>
             <div>
               <h3 className="text-lg font-medium mb-2">📋 Sheet Info</h3>
               <div className="text-sm space-y-1">
                 <div><strong>Sheet ID:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">10RN0XpPpLyVmQB-sEbAgWxmyAcU2Bcwkr_k29RakGTo</code></div>
                 <div><strong>Service Account:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">testtracking@testtrackingdns.iam.gserviceaccount.com</code></div>
                 <div><strong>Project:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">testtrackingdns</code></div>
               </div>
             </div>
           </div>
         </div>

         {/* Domain Setup Info */}
         <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
           <h2 className="text-2xl font-semibold mb-4">🌐 Subdomain Setup: tiktok.chumy.vn</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <h3 className="text-lg font-medium mb-3">📋 Current Status</h3>
               <div className="space-y-2">
                 <div className="flex items-center gap-2">
                   <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                   <span>Domain: <code>tiktok.chumy.vn</code> (Not configured)</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                   <span>Current: <code>{window.location.hostname}</code></span>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                   <span>Target: Custom domain tracking</span>
                 </div>
               </div>
             </div>
             <div>
               <h3 className="text-lg font-medium mb-3">⚙️ Setup Required</h3>
               <div className="text-sm space-y-1">
                 <div>1. <strong>DNS CNAME Record:</strong></div>
                 <div className="ml-4 bg-gray-100 dark:bg-gray-700 p-2 rounded font-mono text-xs">
                   tiktok.chumy.vn → [cloudflare-pages-url]
                 </div>
                 <div>2. <strong>Cloudflare Pages Custom Domain</strong></div>
                 <div>3. <strong>SSL Certificate (Auto)</strong></div>
               </div>
             </div>
           </div>
           <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
             <p className="text-sm"><strong>📞 Need Help?</strong> Please provide:</p>
             <ul className="text-sm mt-2 ml-4 space-y-1">
               <li>• Where is <code>chumy.vn</code> hosted? (Cloudflare, GoDaddy, etc.)</li>
               <li>• Who manages DNS records?</li>
               <li>• Current Cloudflare Pages URL for this project?</li>
             </ul>
           </div>
         </div>

         {/* API Testing Section */}
         <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
           <h2 className="text-2xl font-semibold mb-4">🧪 API Testing & Debug</h2>
           <div className="flex flex-wrap gap-4">
             <button 
               onClick={() => testApiEndpoint()}
               className="px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
             >
               🚀 Test API /api/track
             </button>
             <button 
               onClick={() => testGoogleSheetsPermission()}
               className="px-6 py-3 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
             >
               🔐 Debug Google Sheets API
             </button>
             <button 
               onClick={() => window.open('https://docs.google.com/spreadsheets/d/10RN0XpPpLyVmQB-sEbAgWxmyAcU2Bcwkr_k29RakGTo/edit', '_blank')}
               className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
             >
               📊 Monitor Sheet Realtime
             </button>
             <button 
               onClick={() => window.open('/api/debug-sheets', '_blank')}
               className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
             >
               🐛 Raw Debug API
             </button>
           </div>
           <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
             <p className="text-sm"><strong>🔍 Debug Steps:</strong></p>
             <ol className="text-sm mt-2 ml-4 space-y-1 list-decimal">
               <li>Click &quot;Test API /api/track&quot; - should show success</li>
               <li>Click &quot;Debug Google Sheets API&quot; - check environment variables</li>
               <li>Click &quot;Monitor Sheet Realtime&quot; - watch for new rows</li>
               <li>Check debug console below for detailed logs</li>
             </ol>
           </div>
         </div>

         {/* Footer với Links */}
         <footer className="mt-16 text-center border-t border-gray-200 dark:border-gray-700 pt-8">
           <div className="flex flex-wrap justify-center gap-6">
             <a
               href="https://docs.google.com/spreadsheets/d/10RN0XpPpLyVmQB-sEbAgWxmyAcU2Bcwkr_k29RakGTo/edit"
               target="_blank"
               rel="noopener noreferrer"
               className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
             >
               📊 Xem Google Sheet
             </a>
            <a
              href="/TRACKING-SETUP.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              📖 Setup Guide
            </a>
            <a
              href="https://github.com/yukio182/test-tracking"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
            >
              💻 GitHub Code
            </a>
          </div>
          <p className="mt-4 text-gray-500 text-sm">
            🚀 TikTok Visitor Tracking System - tiktok.chumy.vn
          </p>
        </footer>
      </div>
    </div>
  );
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
