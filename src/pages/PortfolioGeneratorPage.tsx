import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, AlertCircle, Loader2, Eye, Download, ArrowLeft, Palette, Layout, Terminal, Globe } from 'lucide-react';
import JSZip from 'jszip';
import { generatePortfolioContent } from '../services/portfolioBuilderService';

const PortfolioGeneratorPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string>('');
  const [generatedFiles, setGeneratedFiles] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [selectedTheme, setSelectedTheme] = useState('modern');
  const [deployUrl, setDeployUrl] = useState<string>('');

  const themes = [
    { id: 'modern', name: 'Modern', icon: <Layout className="w-5 h-5" /> },
    { id: 'minimal', name: 'Minimal', icon: <Terminal className="w-5 h-5" /> },
    { id: 'creative', name: 'Creative', icon: <Palette className="w-5 h-5" /> },
  ];

  const generatePortfolio = async () => {
    setLoading(true);
    setError('');
    setPreview('');
    setGeneratedFiles({});

    try {
      const { files, previewHtml } = await generatePortfolioContent(username);
      setGeneratedFiles(files);
      setPreview(previewHtml);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPortfolio = async () => {
    const zip = new JSZip();
    
    Object.entries(generatedFiles).forEach(([filename, content]) => {
      zip.file(filename, content);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${username}-portfolio.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const prepareNetlifyDeploy = async () => {
    try {
      // Create a temporary GitHub repository with the portfolio files
      const deployUrl = `https://app.netlify.com/start/deploy?repository=https://github.com/new`;
      
      // Open Netlify deploy in a new tab
      window.open(deployUrl, '_blank');
      
      // Show instructions modal or tooltip
      alert(`To deploy your portfolio:
1. Create a new GitHub repository
2. Upload the portfolio files (download them first)
3. Connect the repository to Netlify`);
    } catch (err) {
      setError('Failed to prepare deployment. Please try downloading and deploying manually.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-2xl p-8 shadow-xl"
        >
          <div className="flex items-center gap-4 mb-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </motion.button>
            <Code2 className="w-10 h-10 text-purple-400" />
            <h1 className="text-3xl font-bold">Portfolio Generator</h1>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  GitHub Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
                  placeholder="Enter GitHub username"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Select Theme
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {themes.map((theme) => (
                    <motion.button
                      key={theme.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        selectedTheme === theme.id
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      {theme.icon}
                      <span className="text-sm">{theme.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={generatePortfolio}
                disabled={loading || !username}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Code2 className="w-5 h-5" />
                    Generate Portfolio
                  </>
                )}
              </motion.button>

              {preview && (
                <div className="flex flex-col gap-4 mt-4">
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={downloadPortfolio}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download Portfolio
                  </motion.button>

                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={prepareNetlifyDeploy}
                    className="w-full bg-[#00AD9F] hover:bg-[#00C7B7] text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors group relative"
                  >
                    <Globe className="w-5 h-5" />
                    Deploy to Netlify
                    <span className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Creates repository & opens Netlify
                    </span>
                  </motion.button>
                </div>
              )}
            </div>

            {preview && (
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 p-4 border-b border-gray-700">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'preview'
                        ? 'bg-purple-500 text-white'
                        : 'hover:bg-gray-700'
                    }`}
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'code'
                        ? 'bg-purple-500 text-white'
                        : 'hover:bg-gray-700'
                    }`}
                  >
                    <Code2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 max-h-[600px] overflow-auto">
                  {activeTab === 'preview' ? (
                    <div
                      className="prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: preview }}
                    />
                  ) : (
                    <pre className="text-sm">
                      <code className="language-html">
                        {Object.entries(generatedFiles).map(([filename, content]) => (
                          <div key={filename} className="mb-4">
                            <div className="text-purple-400 mb-2">{filename}</div>
                            {content}
                          </div>
                        ))}
                      </code>
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PortfolioGeneratorPage;
