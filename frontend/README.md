# Frontend - Excel Data Query Tool

This is the frontend React application for the Excel Data Query Tool.

## Environment Variables

Create a `.env` file with the following variables:

```
VITE_API_URL=https://your-backend-url.onrender.com/api
```

## Deployment on Render

1. Connect your GitHub repository to Render
2. Create a new **Web Service**
3. Set the following:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview`
   - **Root Directory**: `frontend`
   - **Environment**: Node
   - **Node Version**: 18 or higher

## Environment Variables for Production

Add these environment variables in Render dashboard:
- `VITE_API_URL`: Your backend API URL (e.g., `https://your-backend.onrender.com/api`)

## Local Development

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`
