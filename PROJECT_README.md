# Excel Data Query Tool

A full-stack application for uploading, storing, and querying Excel data with advanced search capabilities.

## Project Structure

```
├── frontend/          # React + TypeScript + Vite frontend
│   ├── components/    # React components
│   ├── services/      # API services
│   └── ...
├── backend/           # Node.js + Express + PostgreSQL backend
│   ├── src/          # TypeScript source code
│   ├── database/     # Database scripts
│   └── ...
└── README.md
```

## Features

- 📁 **File Upload**: Upload Excel files with multiple sheets
- 🔍 **Advanced Search**: Search by company, product, and date ranges
- 📊 **Cross-sheet Lookup**: RC number lookup across different sheets
- 💡 **Auto-suggestions**: Real-time suggestions for company and product names
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🗄️ **PostgreSQL Storage**: Reliable data storage and querying

## Deployment

This project is structured for easy deployment on Render.com with separate frontend and backend services.

### Backend Deployment (Deploy First)

1. Create a **PostgreSQL** database service on Render
2. Create a **Web Service** for the backend:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `DATABASE_URL`: (from your PostgreSQL service)
     - `NODE_ENV`: `production`

### Frontend Deployment

1. Create a **Static Site** service on Render:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variables**:
     - `VITE_API_URL`: `https://your-backend-service.onrender.com/api`

## Local Development

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Setup

1. Backend: Copy `backend/.env.example` to `backend/.env` and configure
2. Frontend: Copy `frontend/.env.example` to `frontend/.env` and configure

## Database

The application automatically creates necessary tables on first run. Make sure your PostgreSQL database is accessible and the connection string is correct.
