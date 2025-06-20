import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Lấy visitor data từ request
    const data = await request.json() as any
    
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

    // Ghi vào Google Sheets
    await writeToGoogleSheet(visitorData)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking visitor:', error)
    return NextResponse.json({ error: 'Failed to track visitor' }, { status: 500 })
  }
}

async function writeToGoogleSheet(data: any) {
  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    if (!serviceAccountJson) {
      console.log('Google Service Account not configured')
      return
    }

    const serviceAccount = JSON.parse(serviceAccountJson)
    
    // Tạo JWT token
    const jwt = await createJWT(serviceAccount)
    
    // Lấy access token
    const accessToken = await getAccessToken(jwt)
    
    // Ghi data vào sheet
    await appendToSheet(accessToken, data)
    
  } catch (error) {
    console.error('Error writing to Google Sheet:', error)
  }
}

async function createJWT(serviceAccount: any) {
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
  
  const data = await response.json()
  return data.access_token
}

async function appendToSheet(accessToken: string, visitorData: any) {
  const sheetId = process.env.GOOGLE_SHEET_ID || '10RN0XpPpLyVmQB-sEbAgWxmyAcU2Bcwkr_k29RakGTo'
  const range = 'Sheet1!A:K'
  
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
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=RAW`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: values
    })
  })
  
  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`)
  }
  
  console.log('Successfully logged visitor to Google Sheet')
}

function str2ab(str: string) {
  const buf = new ArrayBuffer(str.length)
  const bufView = new Uint8Array(buf)
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i)
  }
  return buf
} 