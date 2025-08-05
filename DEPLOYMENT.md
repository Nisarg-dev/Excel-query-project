# Deployment Instructions for Render

## Prerequisites
1. Push your code to a GitHub repository
2. Have a Render account (render.com)

## Step 1: Deploy Backend (PostgreSQL + Web Service)

### 1.1 Create PostgreSQL Database
1. Go to Render Dashboard
2. Click "New +" → "PostgreSQL"
3. Name: `excel-query-db`
4. Plan: Free tier is fine for testing
5. Click "Create Database"
6. **Copy the Internal Database URL** (starts with `postgresql://`)

### 1.2 Create Backend Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `excel-query-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free tier

4. **Environment Variables**:
   - `DATABASE_URL`: (paste the PostgreSQL Internal Database URL)
   - `NODE_ENV`: `production`
   - `PORT`: `3001`

5. Click "Create Web Service"
6. Wait for deployment (5-10 minutes)
7. **Copy the backend URL** (e.g., `https://excel-query-backend.onrender.com`)

## Step 2: Deploy Frontend (Static Site)

### 2.1 Create Static Site
1. Click "New +" → "Static Site"
2. Connect the same GitHub repository
3. Configure:
   - **Name**: `excel-query-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. **Environment Variables**:
   - `VITE_API_URL`: `https://your-backend-url.onrender.com/api`
   (Replace with your actual backend URL from Step 1.2)

5. Click "Create Static Site"
6. Wait for deployment (5-10 minutes)

## Step 3: Verify Deployment

1. Open your frontend URL
2. The search functionality should work
3. Upload is hidden as requested

## Important Notes

- **Free tier limitations**: Services may sleep after 15 minutes of inactivity
- **Cold starts**: First request after sleep may take 30-60 seconds
- **Database**: PostgreSQL free tier has storage limits
- **CORS**: Already configured for production

## Troubleshooting

If you encounter issues:

1. **Backend not starting**: Check environment variables and build logs
2. **Frontend can't connect**: Verify `VITE_API_URL` is correct
3. **Database errors**: Ensure `DATABASE_URL` is correct and accessible
4. **Upload issues**: Ensure backend has write permissions (should work on Render)

## Local Testing

Before deploying, test locally:

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Environment Files

Make sure you have:
- `backend/.env` (for local development)
- `frontend/.env` (for local development)

Never commit these files to Git!
