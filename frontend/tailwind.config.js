/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb', // blue-600
        primaryDark: '#1e40af', // blue-800
        secondary: '#fbbf24', // yellow-400
        secondaryDark: '#b45309', // yellow-700
        accent: '#ef4444', // red-500
        accentDark: '#991b1b', // red-800
        background: '#f9fafb', // gray-50
        surface: '#ffffff', // white
        textPrimary: '#111827', // gray-900
        textSecondary: '#6b7280', // gray-500
      },
    },
  },
  plugins: [],
}
