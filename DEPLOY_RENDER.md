Deploying OmniReception to Render (free tier)

Overview
- This project is a full-stack app (Vite React client + Express server). For public webhooks you need a server reachable on the internet. GitHub hosts code (and static pages), but it does not run Node servers — so use Render to host the backend.

Prereqs
- A GitHub repository with this code pushed
- A Render account (https://render.com)

Step-by-step
1) Push the repo to GitHub
   - git init; git remote add origin <your-repo>; git add .; git commit -m "init"; git push -u origin main

2) Create a Render Web Service
   - In Render, click New > Blueprint, select your GitHub repo
   - Render auto-detects render.yaml at the root and proposes the service
   - Confirm settings and click Apply

3) First deploy
   - Render runs: npm ci && npm run build, then starts with npm start
   - Health check path is /health
   - After deploy, you will get a public URL like https://omni-reception.onrender.com

4) Configure environment variables (optional)
   - NODE_ENV is set to production by the blueprint
   - OPENAI_API_KEY, DATABASE_URL, SESSION_SECRET can be set in Render > Environment if needed

5) Using webhooks
   - Telegram webhook URL: https://<your-render-host>/hooks/telegram/<userId>
   - WhatsApp webhook URL: https://<your-render-host>/hooks/whatsapp/<userId>
   - In the app’s Channels page, each doctor configures their own tokens and secrets; no code changes are required

6) Client routing
   - In production, the server serves the built client from dist/public and handles SPA routing

Notes
- Vite config is dev-only; in production, requests are handled by Express
- If you use a different host (Railway/Fly/Heroku), the same build/start commands apply

