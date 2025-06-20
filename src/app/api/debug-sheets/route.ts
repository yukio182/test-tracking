import { NextRequest, NextResponse } from 'next/server'

interface ServiceAccount {
  client_email: string
  private_key: string
}

interface GoogleOAuthResponse {
  access_token: string
}

export async function GET() {
  try {
    console.log('🔍 DEBUG SHEETS: Starting debug process...')
    
    // Check environment variables
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    const sheetId = process.env.GOOGLE_SHEET_ID
    
    console.log('🔍 DEBUG SHEETS: Environment check:')
    console.log('- GOOGLE_SERVICE_ACCOUNT_JSON exists:', !!serviceAccountJson)
    console.log('- GOOGLE_SHEET_ID:', sheetId)
    
    if (!serviceAccountJson) {
      return NextResponse.json({
        error: 'GOOGLE_SERVICE_ACCOUNT_JSON not configured',
        status: 'failed',
        details: 'Environment variable missing'
      }, { status: 500 })
    }

    // Parse service account
    let serviceAccount: ServiceAccount
    try {
      serviceAccount = JSON.parse(serviceAccountJson)
      console.log('🔍 DEBUG SHEETS: Service account parsed successfully')
      console.log('- Client email:', serviceAccount.client_email)
    } catch (error) {
      console.error('🔍 DEBUG SHEETS: Failed to parse service account JSON:', error)
      return NextResponse.json({
        error: 'Invalid GOOGLE_SERVICE_ACCOUNT_JSON format',
        status: 'failed',
        details: error instanceof Error ? error.message : 'JSON parse error'
      }, { status: 500 })
    }

    // Test JWT creation
    console.log('🔍 DEBUG SHEETS: Creating JWT token...')
    const jwt = await createJWT(serviceAccount)
    console.log('🔍 DEBUG SHEETS: JWT created successfully')

    // Test token exchange
    console.log('🔍 DEBUG SHEETS: Exchanging JWT for access token...')
    const accessToken = await getAccessToken(jwt)
    console.log('🔍 DEBUG SHEETS: Access token obtained')

    // Test sheet access
    console.log('🔍 DEBUG SHEETS: Testing sheet access...')
    const testResult = await testSheetAccess(accessToken, sheetId || '10RN0XpPpLyVmQB-sEbAgWxmyAcU2Bcwkr_k29RakGTo')
    
    return NextResponse.json({
      status: 'success',
      message: 'Google Sheets debug completed successfully',
      details: {
        serviceAccountEmail: serviceAccount.client_email,
        sheetId: sheetId,
        testResult: testResult
      }
    })

  } catch (error) {
    console.error('🔍 DEBUG SHEETS: Error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      status: 'failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('🔍 DEBUG SHEETS: OAuth error:', errorText)
    throw new Error(`OAuth error: ${response.status} - ${errorText}`)
  }
  
  const data = await response.json() as GoogleOAuthResponse
  return data.access_token
}

async function testSheetAccess(accessToken: string, sheetId: string) {
  console.log('🔍 DEBUG SHEETS: Testing sheet access with ID:', sheetId)
  
  // Test 1: Get sheet metadata
  const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`
  const metadataResponse = await fetch(metadataUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!metadataResponse.ok) {
    const errorText = await metadataResponse.text()
    console.error('🔍 DEBUG SHEETS: Metadata access failed:', errorText)
    throw new Error(`Sheet metadata access failed: ${metadataResponse.status} - ${errorText}`)
  }

  const metadata = await metadataResponse.json()
  console.log('🔍 DEBUG SHEETS: Sheet metadata:', metadata.properties?.title)

  // Test 2: Try to read values
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:J1`
  const valuesResponse = await fetch(valuesUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!valuesResponse.ok) {
    const errorText = await valuesResponse.text()
    console.error('🔍 DEBUG SHEETS: Values read failed:', errorText)
    return {
      metadata: metadata.properties?.title,
      canRead: false,
      error: errorText
    }
  }

  const values = await valuesResponse.json()
  console.log('🔍 DEBUG SHEETS: Values read success:', values)

  return {
    sheetTitle: metadata.properties?.title,
    canRead: true,
    existingData: values.values || []
  }
}

function str2ab(str: string) {
  const buf = new ArrayBuffer(str.length)
  const bufView = new Uint8Array(buf)
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i)
  }
  return buf
} 