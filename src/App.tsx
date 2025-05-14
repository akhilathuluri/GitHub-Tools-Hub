import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import GithubTokenPage from './pages/GithubTokenPage';
import DocGeneratorPage from './pages/DocGeneratorPage';
import ResumeGeneratorPage from './pages/ResumeGeneratorPage';
import PortfolioGeneratorPage from './pages/PortfolioGeneratorPage';
import CodeTranslatorPage from './pages/CodeTranslatorPage';
import LearningPathPage from './pages/LearningPathPage';
import ChatbotPage from './pages/ChatbotPage';
import ChallengeGeneratorPage from './pages/ChallengeGeneratorPage';
import CodebaseVisualizerPage from './pages/CodebaseVisualizerPage';
import SettingsPage from './pages/SettingsPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center">
      Loading...
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" />;
  }

  return children;
};

function AppRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/github-token" element={
          <ProtectedRoute>
            <GithubTokenPage />
          </ProtectedRoute>
        } />
        <Route path="/doc-generator" element={
          <ProtectedRoute>
            <DocGeneratorPage />
          </ProtectedRoute>
        } />
        <Route path="/resume-generator" element={
          <ProtectedRoute>
            <ResumeGeneratorPage />
          </ProtectedRoute>
        } />
        <Route path="/portfolio-generator" element={
          <ProtectedRoute>
            <PortfolioGeneratorPage />
          </ProtectedRoute>
        } />
        <Route path="/code-translator" element={
          <ProtectedRoute>
            <CodeTranslatorPage />
          </ProtectedRoute>
        } />
        <Route path="/learning-path" element={
          <ProtectedRoute>
            <LearningPathPage />
          </ProtectedRoute>
        } />
        <Route path="/chatbot" element={
          <ProtectedRoute>
            <ChatbotPage />
          </ProtectedRoute>
        } />
        <Route path="/challenges" element={
          <ProtectedRoute>
            <ChallengeGeneratorPage />
          </ProtectedRoute>
        } />
        <Route path="/visualizer" element={
          <ProtectedRoute>
            <CodebaseVisualizerPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;