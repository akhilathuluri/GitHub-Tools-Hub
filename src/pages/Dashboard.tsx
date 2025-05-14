import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileCode, FileText, Key, LogOut, User, Code2, BookOpen, MessageSquare, Brain, GitBranch, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const tools = [
    {
      icon: <Key className="w-8 h-8" />,
      title: 'GitHub Token',
      description: 'Set up your GitHub token for seamless integration',
      path: '/github-token',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: <FileCode className="w-8 h-8" />,
      title: 'Documentation Generator',
      description: 'Generate comprehensive documentation for your repositories',
      path: '/doc-generator',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Resume Generator',
      description: 'Create a professional resume from your GitHub profile',
      path: '/resume-generator',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: <Code2 className="w-8 h-8" />,
      title: 'Portfolio Generator',
      description: 'Generate a beautiful portfolio website from your GitHub profile',
      path: '/portfolio-generator',
      color: 'from-purple-500 to-indigo-500'
    },
    {
      icon: <Code2 className="w-8 h-8" />,
      title: 'Code Translator',
      description: 'Convert code between different programming languages using AI',
      path: '/code-translator',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Learning Path',
      description: 'Get personalized learning recommendations based on GitHub activity',
      path: '/learning-path',
      color: 'from-teal-500 to-emerald-500'
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: 'Repository Chatbot',
      description: 'AI-powered chatbot to answer questions about your repositories',
      path: '/chatbot',
      color: 'from-rose-500 to-pink-500'
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: 'Coding Challenges',
      description: 'Get personalized coding challenges based on your GitHub activity',
      path: '/challenges',
      color: 'from-indigo-500 to-blue-500'
    },
    {
      icon: <GitBranch className="w-8 h-8" />,
      title: 'Codebase Visualizer',
      description: 'Generate visual mind maps and flowcharts from repositories',
      path: '/visualizer',
      color: 'from-cyan-500 to-blue-500'
    }
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-12">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold"
          >
            Welcome to Your Dashboard
          </motion.h1>
          <div className="flex items-center gap-4">
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </motion.button>
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </motion.button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(tool.path)}
              className={`bg-gradient-to-r ${tool.color} p-6 rounded-xl cursor-pointer transform hover:scale-105 transition-all`}
            >
              <div className="bg-white/10 w-16 h-16 rounded-lg flex items-center justify-center mb-4">
                {tool.icon}
              </div>
              <h2 className="text-xl font-bold mb-2">{tool.title}</h2>
              <p className="text-white/80">{tool.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;