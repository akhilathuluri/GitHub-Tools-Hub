import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GitBranch, AlertCircle, Loader2, ArrowLeft, Download, Code2, FileTree } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';
import Mermaid from '@kyper/mermaid';
import mermaid from 'mermaid';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: true,
    background: '#1f2937',
    primaryColor: '#06b6d4',
    primaryTextColor: '#fff',
    primaryBorderColor: '#06b6d4',
    lineColor: '#64748b',
    textColor: '#f3f4f6'
  }
});

const genAI = new GoogleGenerativeAI('AIzaSyCOKzTa6TMCkTKe4OQk_bJ46Jp2tLw8FGM');

interface CodebaseMap {
  flowchart: string;
  dependencies: string;
  structure: string;
  summary: string;
}

const CodebaseVisualizerPage = () => {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visualization, setVisualization] = useState<CodebaseMap | null>(null);
  const [activeView, setActiveView] = useState<'flow' | 'deps' | 'structure'>('flow');
  const diagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visualization && diagramRef.current) {
      const diagram = activeView === 'flow' ? visualization.flowchart :
                     activeView === 'deps' ? visualization.dependencies :
                     visualization.structure;
      
      try {
        mermaid.render(`mermaid-${activeView}`, diagram).then(({ svg }) => {
          if (diagramRef.current) {
            diagramRef.current.innerHTML = svg;
          }
        });
      } catch (err) {
        console.error('Failed to render diagram:', err);
      }
    }
  }, [visualization, activeView]);

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

  const analyzeRepository = async () => {
    const token = await fetchGitHubToken();
    const urlParts = new URL(repoUrl).pathname.split('/').filter(Boolean);
    if (urlParts.length < 2) throw new Error('Invalid repository URL');
    const [owner, repo] = urlParts;

    // Fetch repository contents recursively
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) throw new Error('Failed to fetch repository contents');
    const data = await response.json();

    // Get package.json for dependency analysis
    const packageJson = data.tree.find((file: any) => file.path === 'package.json');
    let dependencies = {};
    
    if (packageJson) {
      const contentResponse = await fetch(packageJson.url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (contentResponse.ok) {
        const { content } = await contentResponse.json();
        const decoded = JSON.parse(atob(content));
        dependencies = {
          dependencies: decoded.dependencies || {},
          devDependencies: decoded.devDependencies || {}
        };
      }
    }

    return {
      files: data.tree,
      dependencies,
      path: `${owner}/${repo}`
    };
  };

  const generateVisualization = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    setLoading(true);
    setError('');
    setVisualization(null);

    try {
      const repoData = await analyzeRepository();
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Analyze this repository structure and create Mermaid visualizations.
Repository: ${repoData.path}

Files: ${JSON.stringify(repoData.files.map(f => f.path))}
Dependencies: ${JSON.stringify(repoData.dependencies)}

Return ONLY a JSON object (without any markdown formatting or code blocks) containing exactly these fields:
{
  "flowchart": "mermaid flowchart syntax here",
  "dependencies": "mermaid dependency diagram syntax here",
  "structure": "mermaid folder structure syntax here",
  "summary": "brief description here"
}

Do not include any explanations or additional text, just the JSON object.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Clean the response text
      const cleanedText = responseText
        .replace(/```json\s*|\s*```/g, '') // Remove code blocks
        .replace(/[\u201C\u201D]/g, '"')   // Replace smart quotes
        .replace(/[\u2018\u2019]/g, "'")   // Replace smart single quotes
        .trim();
      
      try {
        const visualData = JSON.parse(cleanedText);
        
        // Validate required fields
        const requiredFields = ['flowchart', 'dependencies', 'structure', 'summary'];
        const missingFields = requiredFields.filter(field => !visualData[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Invalid visualization format: missing ${missingFields.join(', ')}`);
        }

        setVisualization(visualData);
      } catch (parseError) {
        console.error('Parse Error:', parseError);
        console.error('Raw Response:', responseText);
        console.error('Cleaned Text:', cleanedText);
        throw new Error('Failed to parse visualization data. Please try again.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadSVG = () => {
    if (!visualization || !diagramRef.current) return;
    
    const svg = diagramRef.current.querySelector('svg');
    if (!svg) return;
    
    // Set white background for downloaded SVG
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
      svg {
        background-color: #1f2937;
      }
    `;
    svg.appendChild(style);
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codebase-${activeView}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
            <GitBranch className="w-10 h-10 text-cyan-400" />
            <h1 className="text-3xl font-bold">Codebase Visualizer</h1>
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
            <div className="flex gap-4">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="flex-1 bg-gray-700 rounded-lg px-4 py-3 border border-gray-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition"
                placeholder="https://github.com/username/repository"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={generateVisualization}
                disabled={loading || !repoUrl}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Code2 className="w-5 h-5" />
                )}
                Visualize Codebase
              </motion.button>
            </div>
          </div>

          {visualization && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveView('flow')}
                    className={`px-4 py-2 rounded-lg ${
                      activeView === 'flow' 
                        ? 'bg-cyan-500 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Code Flow
                  </button>
                  <button
                    onClick={() => setActiveView('deps')}
                    className={`px-4 py-2 rounded-lg ${
                      activeView === 'deps'
                        ? 'bg-cyan-500 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Dependencies
                  </button>
                  <button
                    onClick={() => setActiveView('structure')}
                    className={`px-4 py-2 rounded-lg ${
                      activeView === 'structure'
                        ? 'bg-cyan-500 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Structure
                  </button>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={downloadSVG}
                  className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
                >
                  <Download className="w-5 h-5" />
                  Download SVG
                </motion.button>
              </div>

              <div className="bg-gray-700 rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">Architecture Summary</h3>
                  <p className="text-gray-300">{visualization.summary}</p>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg overflow-auto">
                  <div ref={diagramRef} className="mermaid-diagram" />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CodebaseVisualizerPage;
