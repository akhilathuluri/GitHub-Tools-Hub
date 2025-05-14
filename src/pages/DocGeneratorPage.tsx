import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileCode, AlertCircle, Loader2, Copy, Check, History, ArrowLeft, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { jsPDF } from 'jspdf';

const genAI = new GoogleGenerativeAI('AIzaSyCOKzTa6TMCkTKe4OQk_bJ46Jp2tLw8FGM');

const DocGeneratorPage = () => {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [documentation, setDocumentation] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [repoAnalytics, setRepoAnalytics] = useState<{
    info: any;
    codeQuality: any;
    insights: any;
    dependencies: any;
    languages: any;
    largestFiles: any[];
    fileTree: any;
  } | null>(null);

  useEffect(() => {
    checkAuth();
    fetchHistory();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) navigate('/auth');
  };

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('documentation_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setHistory(data);
  };

  const fetchGitHubToken = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('github_tokens')
      .select('token')
      .eq('user_id', user.id)
      .single();

    if (error || !data) throw new Error('GitHub token not found');
    return data.token;
  };

  const fetchRepoContents = async (token: string, owner: string, repo: string, path: string = '') => {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch repository content: ${response.statusText}`);
    }

    const contents = await response.json();
    let allContents = [];

    for (const item of Array.isArray(contents) ? contents : [contents]) {
      if (item.type === 'file') {
        allContents.push({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size
        });
      } else if (item.type === 'dir') {
        const subContents = await fetchRepoContents(token, owner, repo, item.path);
        allContents = [...allContents, ...subContents];
      }
    }

    return allContents;
  };

  const analyzeRepository = async (token: string, owner: string, repo: string) => {
    // Repository Information
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    const repoInfo = await repoResponse.json();

    // Languages Distribution
    const languagesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/languages`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    const languages = await languagesResponse.json();

    // Get all files for size analysis
    const contents = await fetchRepoContents(token, owner, repo);
    const sortedFiles = contents
      .filter(file => file.type === 'file')
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    // Get package.json for dependency analysis
    const packageJsonResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    ).catch(() => null);

    let dependencies = { production: [], development: [] };
    if (packageJsonResponse && packageJsonResponse.ok) {
      const { content } = await packageJsonResponse.json();
      const packageJson = JSON.parse(atob(content));
      dependencies = {
        production: Object.entries(packageJson.dependencies || {}),
        development: Object.entries(packageJson.devDependencies || {})
      };
    }

    return {
      info: repoInfo,
      codeQuality: {
        openIssues: repoInfo.open_issues_count,
        hasWorkflows: Boolean(repoInfo.workflows_url),
        hasLicense: Boolean(repoInfo.license),
        hasDescription: Boolean(repoInfo.description)
      },
      insights: {
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        watchers: repoInfo.watchers_count,
        lastUpdate: repoInfo.updated_at
      },
      dependencies,
      languages,
      largestFiles: sortedFiles,
      fileTree: contents
    };
  };

  const generateDocumentation = async () => {
    setLoading(true);
    setError('');
    setDocumentation('');
    setRepoAnalytics(null);

    try {
      const token = await fetchGitHubToken();
      const urlParts = new URL(repoUrl).pathname.split('/').filter(Boolean);
      if (urlParts.length < 2) throw new Error('Invalid repository URL');
      const [owner, repo] = urlParts;

      // First analyze the repository
      const analytics = await analyzeRepository(token, owner, repo);
      setRepoAnalytics(analytics);

      // Generate documentation using Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Generate comprehensive documentation for this GitHub repository:
      
Repository Analysis:
${JSON.stringify(analytics, null, 2)}

Please include:
1. Repository Overview
2. Code Quality Analysis
3. Repository Insights
4. Dependency Analysis
5. Language Distribution
6. File Structure
7. Setup Instructions
8. Usage Examples`;
      
      const result = await model.generateContent(prompt);
      const generatedText = result.response.text();
      setDocumentation(generatedText);

      // Save to history with only essential data
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('documentation_history')
          .insert({
            user_id: user.id,
            repo_url: repoUrl,
            documentation: generatedText
          });

        if (error) {
          console.error('Error saving to database:', error);
          throw new Error('Failed to save documentation');
        }

        fetchHistory();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(documentation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generatePDF = async (content: string = documentation, currentRepoUrl: string = repoUrl) => {
    try {
      setLoading(true);
      const repoName = currentRepoUrl.split('/').pop() || 'documentation';
      const timestamp = new Date().toISOString().split('T')[0];

      // Initialize PDF document
      const doc = new jsPDF();
      
      // Set initial y position
      let y = 20;
      
      // Add title
      doc.setFontSize(24);
      doc.setTextColor(41, 128, 185); // #2980b9
      doc.text(`${repoName} Documentation`, 20, y);
      y += 10;

      // Add timestamp
      doc.setFontSize(12);
      doc.setTextColor(127, 140, 141); // #7f8c8d
      doc.text(`Generated on ${new Date().toLocaleString()}`, 20, y);
      y += 20;

      // Process content sections
      const sections = content.split('\n\n');
      doc.setTextColor(0);

      for (const section of sections) {
        const trimmed = section.trim();

        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          // Heading
          doc.setFontSize(16);
          doc.setTextColor(52, 73, 94); // #34495e
          const text = trimmed.replace(/\*\*/g, '');
          doc.text(text, 20, y);
          y += 10;
        } else if (trimmed.startsWith('*')) {
          // Bullet point
          doc.setFontSize(12);
          doc.setTextColor(0);
          const text = '• ' + trimmed.substring(1).trim();
          const lines = doc.splitTextToSize(text, 170);
          lines.forEach(line => {
            if (y > 280) { // Check if we need a new page
              doc.addPage();
              y = 20;
            }
            doc.text(line, 30, y);
            y += 7;
          });
        } else if (trimmed.startsWith('```')) {
          // Code block
          doc.setFontSize(10);
          doc.setTextColor(0);
          const text = trimmed.replace(/```/g, '').trim();
          const lines = doc.splitTextToSize(text, 160);
          
          // Add code background
          doc.setFillColor(247, 249, 250); // #f7f9fa
          doc.rect(20, y - 5, 170, lines.length * 7 + 10, 'F');
          
          lines.forEach(line => {
            if (y > 280) {
              doc.addPage();
              y = 20;
            }
            doc.text(line, 25, y);
            y += 7;
          });
          y += 5;
        } else {
          // Regular text
          doc.setFontSize(12);
          doc.setTextColor(0);
          const lines = doc.splitTextToSize(trimmed, 170);
          lines.forEach(line => {
            if (y > 280) {
              doc.addPage();
              y = 20;
            }
            doc.text(line, 20, y);
            y += 7;
          });
        }
        y += 5;
      }

      // Save the PDF
      const filename = `${repoName}-documentation-${timestamp}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (format: 'md' | 'txt' | 'pdf') => {
    try {
      if (format === 'pdf') {
        generatePDF(documentation, repoUrl);
        return;
      }

      const content = format === 'md' ? processMarkdown() : documentation;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentation.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading:', err);
      setError('Failed to download. Please try again.');
    }
  };

  const processMarkdown = (content: string = documentation) => {
    // Convert documentation to proper markdown format
    const sections = content.split('\n\n');
    return sections.map(section => {
      if (section.trim().startsWith('*')) {
        return `## ${section.replace('*', '').trim()}`;
      }
      return section;
    }).join('\n\n');
  };

  const handleHistoryDownload = (historyItem: any, format: 'md' | 'txt' | 'pdf') => {
    try {
      const content = historyItem.documentation;
      if (format === 'pdf') {
        generatePDF(content, historyItem.repo_url);
        return;
      }

      const formattedContent = format === 'md' ? processMarkdown(content) : content;
      const blob = new Blob([formattedContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date(historyItem.created_at).toISOString().split('T')[0];
      const repoName = historyItem.repo_url.split('/').pop();
      a.download = `${repoName}-documentation-${timestamp}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading:', err);
      setError('Failed to download. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <div className="max-w-4xl mx-auto">
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
            <FileCode className="w-10 h-10 text-blue-400" />
            <h1 className="text-3xl font-bold">Documentation Generator</h1>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              GitHub Repository URL
            </label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              placeholder="https://github.com/username/repository"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={generateDocumentation}
              disabled={loading || !repoUrl}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileCode className="w-5 h-5" />
              )}
              Generate Documentation
            </motion.button>
          </div>

          {repoAnalytics && (
            <div className="mt-8 space-y-6">
              <h2 className="text-xl font-semibold">Repository Analysis</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Repository Info */}
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Repository Information</h3>
                  <div className="space-y-1 text-sm">
                    <p>Name: {repoAnalytics.info.name}</p>
                    <p>Description: {repoAnalytics.info.description}</p>
                    <p>Created: {new Date(repoAnalytics.info.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Code Quality */}
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Code Quality Analysis</h3>
                  <div className="space-y-1 text-sm">
                    <p>Open Issues: {repoAnalytics.codeQuality.openIssues}</p>
                    <p>CI/CD: {repoAnalytics.codeQuality.hasWorkflows ? 'Yes' : 'No'}</p>
                    <p>License: {repoAnalytics.codeQuality.hasLicense ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                {/* Languages */}
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Language Distribution</h3>
                  <div className="space-y-1 text-sm">
                    {Object.entries(repoAnalytics.languages).map(([lang, bytes]: [string, any]) => (
                      <p key={lang}>{lang}: {Math.round((bytes / Object.values(repoAnalytics.languages).reduce((a: any, b: any) => a + b, 0)) * 100)}%</p>
                    ))}
                  </div>
                </div>

                {/* Largest Files */}
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Largest Files</h3>
                  <div className="space-y-1 text-sm">
                    {repoAnalytics.largestFiles.map((file: any) => (
                      <p key={file.path}>{file.path}: {(file.size / 1024).toFixed(2)} KB</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {documentation && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Generated Documentation</h2>
                <div className="flex items-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                  >
                    {copied ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                    {copied ? 'Copied!' : 'Copy'}
                  </motion.button>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDownload('pdf')}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-lg border border-gray-600"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDownload('md')}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-lg border border-gray-600"
                    >
                      <Download className="w-4 h-4" />
                      .md
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDownload('txt')}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-lg border border-gray-600"
                    >
                      <Download className="w-4 h-4" />
                      .txt
                    </motion.button>
                  </div>
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-6 font-mono text-sm whitespace-pre-wrap">
                {documentation}
              </div>
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <History className="w-5 h-5" />
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
            
            {showHistory && (
              <div className="mt-4 space-y-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-700 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-2">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                        <p className="font-medium mb-2">{item.repo_url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleHistoryDownload(item, 'pdf')}
                          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg border border-gray-600"
                        >
                          <Download className="w-4 h-4" />
                          PDF
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleHistoryDownload(item, 'md')}
                          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg border border-gray-600"
                        >
                          <Download className="w-4 h-4" />
                          .md
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleHistoryDownload(item, 'txt')}
                          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg border border-gray-600"
                        >
                          <Download className="w-4 h-4" />
                          .txt
                        </motion.button>
                      </div>
                    </div>
                    <div 
                      className={`text-sm text-gray-300 ${
                        expandedHistoryId === item.id ? '' : 'line-clamp-3'
                      }`}
                    >
                      {item.documentation}
                    </div>
                    <button
                      onClick={() => setExpandedHistoryId(
                        expandedHistoryId === item.id ? null : item.id
                      )}
                      className="mt-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {expandedHistoryId === item.id ? 'Show Less' : 'Show More'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DocGeneratorPage;