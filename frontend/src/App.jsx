import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login   from './pages/Login';
import Chat    from './pages/Chat';
import History from './pages/History';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const authed = Boolean(localStorage.getItem('token'));
  return authed ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"   element={<Login />} />
        <Route path="/chat"    element={<ProtectedRoute><Chat    /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/"        element={<Navigate to="/chat" replace />} />
        <Route path="*"        element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
