/**
 * api.js — Centralized axios instance for SnapBuy
 *
 * In development: Vite proxy forwards /api/* to localhost:5000
 * In production:  VITE_API_URL points to the Render backend
 *
 * VITE_API_URL must be set in Vercel environment variables as:
 *   https://your-snapbuy-backend.onrender.com
 * (no trailing slash)
 */
import axios from 'axios';

// In production VITE_API_URL = "https://your-render-url.onrender.com"
// In development VITE_API_URL is empty/undefined → Vite proxy handles /api/*
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE,
  withCredentials: false,
  timeout: 30000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize error responses — always produce a string, never an object
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Build a clean string message so JSX never gets an object
    if (!error.response) {
      error.userMessage = 'Cannot reach the server. Please check your connection.';
    } else {
      const data = error.response.data;
      if (typeof data === 'string') {
        error.userMessage = data;
      } else if (data?.error && typeof data.error === 'string') {
        error.userMessage = data.error;
      } else if (data?.message && typeof data.message === 'string') {
        error.userMessage = data.message;
      } else {
        error.userMessage = `Request failed (${error.response.status}). Please try again.`;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
