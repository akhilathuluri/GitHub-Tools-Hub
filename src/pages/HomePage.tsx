import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Github, FileCode, FileText, ArrowRight } from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <Github className="w-20 h-20 mx-auto mb-8" />
          <h1 className="text-5xl font-bold mb-6">GitHub Tools Hub</h1>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Transform your GitHub experience with powerful tools for documentation generation
            and professional resume creation powered by AI.
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/auth')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full
                     font-semibold text-lg flex items-center gap-2 mx-auto"
          >
            Get Started <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid md:grid-cols-2 gap-8 mt-24"
        >
          <div className="bg-gray-800 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <FileCode className="w-12 h-12 text-blue-400 mb-4" />
            <h2 className="text-2xl font-bold mb-4">Documentation Generator</h2>
            <p className="text-gray-300">
              Generate comprehensive documentation for your repositories automatically using
              advanced AI. Perfect for maintaining clear and professional documentation.
            </p>
          </div>

          <div className="bg-gray-800 rounded-xl p-8 transform hover:scale-105 transition-transform">
            <FileText className="w-12 h-12 text-green-400 mb-4" />
            <h2 className="text-2xl font-bold mb-4">GitHub Resume Generator</h2>
            <p className="text-gray-300">
              Create impressive, AI-powered resumes from your GitHub profile. Showcase your
              projects, contributions, and skills professionally.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;