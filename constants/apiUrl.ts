/**
 * Backend API URL configuration.
 * 
 * For production, set the VITE_API_URL environment variable in your .env file:
 *   VITE_API_URL=https://your-script-url.apps.googleusercontent.com
 * 
 * For local development, you can override here or use .env.local
 */
export const API_URL = import.meta.env.VITE_API_URL || 'https://your-gas-web-app-url.script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
