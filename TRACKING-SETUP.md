# 📊 TikTok Visitor Tracking Setup Guide

## 🎯 Overview

Project Next.js này đã được tích hợp visitor tracking để log mọi visitor truy cập vào `tiktok.chumy.vn` và ghi dữ liệu realtime vào Google Sheets.

## ✅ Features

- ✅ **Client-side tracking**: Automatic visitor detection
- ✅ **Google Sheets integration**: Realtime data logging  
- ✅ **Device detection**: Mobile/Desktop, OS, Browser
- ✅ **Geo-location**: Country, City (via Cloudflare headers)
- ✅ **No performance impact**: Non-blocking tracking

## 🏗️ Architecture

```
Visitor → tiktok.chumy.vn → Next.js App → VisitorTracker Component
                                           ↓
                                      /api/track → Google Sheets API
```

## 📋 Files Added/Modified

```
src/
├── app/
│   ├── api/track/route.ts           # API endpoint for tracking
│   ├── components/VisitorTracker.tsx # Client-side tracking component
│   └── layout.tsx                   # Modified to include tracker
└── env.example                      # Environment variables template
```

## 🔧 Environment Variables

Create `.env.local` in root directory:

```bash
# Google Sheets Integration
GOOGLE_SHEET_ID=10RN0XpPpLyVmQB-sEbAgWxmyAcU2Bcwkr_k29RakGTo
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"testtrackingdns",...}

# Optional: Tracking Configuration  
TRACKING_ENABLED=true
TRACKING_DEBUG=false
```

## 📊 Data Tracked

Mỗi visitor tạo 1 row trong Google Sheet với:

| Column | Source | Description |
|--------|--------|-------------|
| Timestamp | Server | ISO timestamp |
| Hostname | Server | tiktok.chumy.vn |
| IP | Cloudflare headers | Visitor IP |
| Country | Cloudflare headers | CF-IPCountry |
| City | Cloudflare headers | CF-IPCity |
| ASN | Cloudflare headers | CF-ASN |
| Device | Client | Mobile/Desktop |
| OS | Client | Windows/macOS/Android/iOS |
| Browser | Client | Chrome/Firefox/Safari/Edge |
| User-Agent | Server | Full UA string |

## 🚀 Deploy to Cloudflare Pages

### Step 1: Configure Environment Variables

In Cloudflare Pages dashboard:

1. Go to **Settings** > **Environment variables**
2. Add the variables from `.env.local`
3. **Important**: Set `GOOGLE_SERVICE_ACCOUNT_JSON` as the full JSON object

### Step 2: Build Settings

```bash
Build command: npm run build
Output directory: .next
Root directory: /
Node.js version: 18.x or higher
```

### Step 3: Custom Domain Setup

1. Add custom domain: `tiktok.chumy.vn`
2. Configure DNS: Point CNAME to Cloudflare Pages URL
3. Enable SSL/TLS

## 📝 Google Sheets Setup

### 1. Service Account (Already Created)
- Email: `testtracking@testtrackingdns.iam.gserviceaccount.com`
- JSON credentials: `testtrackingdns-a0ce964d5917.json`

### 2. Sheet Configuration
- **Sheet ID**: `10RN0XpPpLyVmQB-sEbAgWxmyAcU2Bcwkr_k29RakGTo`
- **Sheet Name**: `Sheet1` (default)
- **Headers**: Timestamp | Hostname | IP | Country | City | ASN | Device | OS | Browser | User-Agent

### 3. Permissions
Share sheet với service account email với quyền **Editor**.

## 🧪 Testing

### Local Development
```bash
npm run dev
# Visit http://localhost:3000
# Check browser console for "Visitor tracked successfully"
```

### Production Testing
```bash
# After deploy, visit: https://tiktok.chumy.vn
# Check Google Sheet for new data rows
```

## 🚨 Troubleshooting

### No data in Google Sheet
1. Check environment variables are set correctly
2. Verify service account has Editor access to sheet
3. Check browser console for JavaScript errors
4. Verify sheet ID is correct

### Build errors
1. Ensure Node.js version >= 18 on Cloudflare Pages
2. Check TypeScript errors in API route
3. Verify all dependencies are installed

### Performance issues
- Tracking is non-blocking - should not affect page load
- API route uses async operations
- Client tracking happens after page load

## 📈 Monitoring

- **Google Sheet**: Real-time data viewing
- **Cloudflare Analytics**: Page view metrics
- **Browser Console**: Client-side tracking logs
- **Cloudflare Functions**: API endpoint logs

## 🔒 Security Notes

- ✅ Service Account with minimal permissions
- ✅ Environment variables (not in code)  
- ✅ Client-side data validation
- ✅ Server-side IP headers from Cloudflare
- ✅ No sensitive data logged

---

**🎉 Ready to track visitors on tiktok.chumy.vn!** 