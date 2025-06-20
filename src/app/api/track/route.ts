import { NextRequest, NextResponse } from 'next/server'

interface VisitorRequest {
  hostname?: string
  path?: string
  referrer?: string
  device?: string
  os?: string
  browser?: string
  screenResolution?: string
  language?: string
  timezone?: string
}

interface VisitorData {
  timestamp: string
  hostname: string
  ip: string
  country: string
  city: string
  asn: string
  device: string
  os: string
  browser: string
  userAgent: string
  path: string
  referrer: string
  cfRay: string
}

interface ServiceAccount {
  client_email: string
  private_key: string
}

interface GoogleOAuthResponse {
  access_token: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API TRACK: POST request received')
    
    // Lấy visitor data từ request
    const data = await request.json() as VisitorRequest
    console.log('🔍 API TRACK: Request body parsed:', data)
    
    // Log tất cả headers quan trọng
    const headers = {
      'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
      'cf-ipcountry': request.headers.get('cf-ipcountry'),
      'cf-ipcity': request.headers.get('cf-ipcity'),
      'cf-asn': request.headers.get('cf-asn'),
      'cf-ray': request.headers.get('cf-ray'),
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'x-real-ip': request.headers.get('x-real-ip'),
      'user-agent': request.headers.get('user-agent')
    }
    console.log('🔍 API TRACK: Request headers:', headers)
    
    // Thêm thông tin từ headers
    const visitorData = {
      timestamp: new Date().toISOString(),
      hostname: data.hostname || request.nextUrl.hostname,
      ip: request.headers.get('cf-connecting-ip') || 
          request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 'unknown',
      country: request.headers.get('cf-ipcountry') || 'unknown',
      city: request.headers.get('cf-ipcity') || 'unknown',
      asn: request.headers.get('cf-asn') || '',
      device: data.device || 'unknown',
      os: data.os || 'unknown', 
      browser: data.browser || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
      path: data.path || '/',
      referrer: data.referrer || '',
      cfRay: request.headers.get('cf-ray') || ''
    }

    console.log('🔍 API TRACK: Final visitor data:', visitorData)

    // Ghi vào Google Sheets
    await writeToGoogleSheet(visitorData)
    
    console.log('🔍 API TRACK: ✅ Response success')
    return NextResponse.json({ 
      success: true, 
      message: 'Visitor tracked successfully',
      data: visitorData 
    })
  } catch (error) {
    console.error('🔍 API TRACK: 🚨 Error tracking visitor:', error)
    return NextResponse.json({ 
      error: 'Failed to track visitor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function writeToGoogleSheet(data: VisitorData) {
  try {
    console.log('🔍 GOOGLE SHEETS: Starting write process...')
    
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    if (!serviceAccountJson) {
      console.log('🔍 GOOGLE SHEETS: ⚠️ Service Account not configured in environment')
      return
    }

    console.log('🔍 GOOGLE SHEETS: Service Account JSON found, parsing...')
    const serviceAccount = JSON.parse(serviceAccountJson)
    console.log('🔍 GOOGLE SHEETS: Using service account:', serviceAccount.client_email)
    
    // Tạo JWT token
    console.log('🔍 GOOGLE SHEETS: Creating JWT token...')
    const jwt = await createJWT(serviceAccount)
    console.log('🔍 GOOGLE SHEETS: JWT token created successfully')
    
    // Lấy access token
    console.log('🔍 GOOGLE SHEETS: Getting access token...')
    const accessToken = await getAccessToken(jwt)
    console.log('🔍 GOOGLE SHEETS: Access token obtained')
    
    // Ghi data vào sheet
    console.log('🔍 GOOGLE SHEETS: Writing data to sheet...')
    await appendToSheet(accessToken, data)
    console.log('🔍 GOOGLE SHEETS: ✅ Data written successfully!')
    
  } catch (error) {
    console.error('🔍 GOOGLE SHEETS: 🚨 Error writing to Google Sheet:', error)
    throw error // Re-throw để API route có thể catch
  }
}

async function createJWT(serviceAccount: ServiceAccount) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }
  
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }
  
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  
  // Import private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    str2ab(atob(serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|\r|\n|-----END PRIVATE KEY-----/g, ''))),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  )
  
  // Sign the token
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsignedToken)
  )
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  return `${unsignedToken}.${encodedSignature}`
}

async function getAccessToken(jwt: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })
  
  const data = await response.json() as GoogleOAuthResponse
  return data.access_token
}

async function appendToSheet(accessToken: string, visitorData: VisitorData) {
  const sheetId = process.env.GOOGLE_SHEET_ID || '10RN0XpPpLyVmQB-sEbAgWxmyAcU2Bcwkr_k29RakGTo'
  const range = 'Sheet1!A:K'
  
  console.log('🔍 APPEND SHEET: Sheet ID:', sheetId)
  console.log('🔍 APPEND SHEET: Range:', range)
  
  const values = [[
    visitorData.timestamp,
    visitorData.hostname,
    visitorData.ip,
    visitorData.country,
    visitorData.city,
    visitorData.asn,
    visitorData.device,
    visitorData.os,
    visitorData.browser,
    visitorData.userAgent
  ]]
  
  console.log('🔍 APPEND SHEET: Row data to append:', values[0])
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=RAW`
  console.log('🔍 APPEND SHEET: API URL:', url)
  
  const requestBody = {
    values: values
  }
  console.log('🔍 APPEND SHEET: Request body:', requestBody)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  
  console.log('🔍 APPEND SHEET: Response status:', response.status)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('🔍 APPEND SHEET: 🚨 API Error response:', errorText)
    throw new Error(`Google Sheets API error: ${response.status} ${response.statusText} - ${errorText}`)
  }
  
  const responseData = await response.json()
  console.log('🔍 APPEND SHEET: ✅ Success response:', responseData)
  console.log('🔍 APPEND SHEET: Successfully logged visitor to Google Sheet')
}

function str2ab(str: string) {
  const buf = new ArrayBuffer(str.length)
  const bufView = new Uint8Array(buf)
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i)
  }
  return buf
} 