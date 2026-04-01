# Free Deployment Guide — Alpha Trading

## Option 1: Vercel (Recommended for frontend)

### Steps:
1. Go to https://vercel.com and sign up with GitHub
2. Click "Add New Project"
3. Import your GitHub repo: github.com/daviddan-241/Alpha-trading-
4. Set these settings:
   - Framework Preset: Vite
   - Root Directory: artifacts/trading-web
   - Build Command: pnpm run build
   - Output Directory: dist
5. Click Deploy → done!

URL will be: https://alpha-trading-xxx.vercel.app

### Environment variables (add in Vercel dashboard):
- VITE_API_URL = https://your-api-server.railway.app  (or leave blank to use fallback data)

---

## Option 2: Netlify

1. Go to https://netlify.com, sign up with GitHub
2. "New site from Git" → connect GitHub → select repo
3. Settings:
   - Base directory: artifacts/trading-web
   - Build command: pnpm run build
   - Publish directory: artifacts/trading-web/dist
4. Add a _redirects file (already included in public/)
5. Click Deploy

---

## Option 3: Replit Deploy (Easiest — full stack)

Deploys BOTH frontend + API together. Just click the Deploy button in Replit.
Your app gets a free `.replit.app` URL with HTTPS.

---

## For the API server (backend):

Deploy to Railway.app (free tier):
1. Go to https://railway.app
2. Connect GitHub repo
3. Select artifacts/api-server as root
4. Set PORT=8080 as environment variable
5. Deploy

Then set VITE_API_URL in Vercel to your Railway URL.
