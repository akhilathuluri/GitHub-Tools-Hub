import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, AlertCircle, Loader2, Copy, Check, History, Download, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import html2pdf from 'html2pdf.js';

const genAI = new GoogleGenerativeAI('AIzaSyCOKzTa6TMCkTKe4OQk_bJ46Jp2tLw8FGM');

interface ResumeData {
  professionalSummary: string;
  technicalSkills: string[];
  projectHighlights: Array<{ name: string; description: string }>;
  contributionsAndAchievements: string[];
  recommendations: string;
}

const formatResumeData = (data: ResumeData) => {
  return JSON.stringify(data, null, 2);
};

const createPDFContent = (content: string, username: string) => {
  let resumeData: ResumeData;
  try {
    resumeData = JSON.parse(content);
  } catch (e) {
    return document.createElement('div');
  }

  const element = document.createElement('div');
  element.innerHTML = `
    <div style="font-family: 'Arial', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background-color: #1A202C; color: #E2E8F0;">
      <h1 style="font-size: 28px; text-align: center; margin-bottom: 30px; color: #F7FAFC; border-bottom: 2px solid #4A5568; padding-bottom: 10px;">
        ${username}'s Resume
      </h1>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 20px; color: #F7FAFC; margin-bottom: 15px; border-bottom: 1px solid #4A5568;">Professional Summary</h2>
        <p style="line-height: 1.6; margin-bottom: 15px;">${resumeData.professionalSummary}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 20px; color: #F7FAFC; margin-bottom: 15px; border-bottom: 1px solid #4A5568;">Technical Skills</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${resumeData.technicalSkills.map(skill => `
            <span style="background: #2D3748; padding: 4px 12px; border-radius: 15px; font-size: 14px;">${skill}</span>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 20px; color: #F7FAFC; margin-bottom: 15px; border-bottom: 1px solid #4A5568;">Project Highlights</h2>
        ${resumeData.projectHighlights.map(project => `
          <div style="margin-bottom: 15px;">
            <h3 style="font-size: 16px; color: #F7FAFC; margin-bottom: 8px;">${project.name}</h3>
            <p style="line-height: 1.6;">${project.description}</p>
          </div>
        `).join('')}
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 20px; color: #F7FAFC; margin-bottom: 15px; border-bottom: 1px solid #4A5568;">Contributions & Achievements</h2>
        <ul style="list-style-type: none; padding: 0;">
          ${resumeData.contributionsAndAchievements.map(achievement => `
            <li style="margin-bottom: 8px; padding-left: 20px; position: relative;">
              <span style="position: absolute; left: 0; color: #A0AEC0;">•</span>
              ${achievement}
            </li>
          `).join('')}
        </ul>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 20px; color: #F7FAFC; margin-bottom: 15px; border-bottom: 1px solid #4A5568;">Recommendations</h2>
        <p style="line-height: 1.6; font-style: italic;">${resumeData.recommendations}</p>
      </div>
    </div>
  `;
  return element;
};

const ResumeGeneratorPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resume, setResume] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
      .from('resume_history')
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

  const generateResume = async () => {
    setLoading(true);
    setError('');
    setResume('');

    try {
      const token = await fetchGitHubToken();
      
      // Fetch user profile
      const userResponse = await fetch(`https://api.github.com/users/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!userResponse.ok) throw new Error('GitHub user not found');
      const userData = await userResponse.json();

      // Fetch repositories
      const reposResponse = await fetch(`https://api.github.com/users/${username}/repos`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!reposResponse.ok) throw new Error('Failed to fetch repositories');
      const reposData = await reposResponse.json();

      // Generate resume using Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Create a professional resume using this GitHub profile data. Respond ONLY with a valid JSON object containing exactly these fields:
      {
        "professionalSummary": "string",
        "technicalSkills": ["string"],
        "projectHighlights": [{"name": "string", "description": "string"}],
        "contributionsAndAchievements": ["string"],
        "recommendations": "string"
      }

      Use this profile data:
      Name: ${userData.name}
      Bio: ${userData.bio}
      Repositories: ${JSON.stringify(reposData)}
      Languages: ${JSON.stringify(userData.languages)}
      Contributions: ${userData.public_repos}`;
      
      const result = await model.generateContent(prompt);
      let resume = result.response.text();
      
      // Clean up the response text to ensure valid JSON
      resume = resume.replace(/```json\s*|\s*```/g, '').trim();
      
      // Validate JSON format
      JSON.parse(resume); // This will throw if invalid JSON
      setResume(resume);

      // Save to history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('resume_history')
          .insert({
            user_id: user.id,
            github_username: username,
            resume_content: resume
          });
        
        fetchHistory();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(resume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadResume = () => {
    const element = createPDFContent(resume, username);
    const opt = {
      margin: [0.5, 0.5],
      filename: `${username}-resume.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { 
        unit: 'in', 
        format: 'a4', 
        orientation: 'portrait'
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
  };

  const ReadMore = ({ text }: { text: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
      <div>
        <p className="text-sm text-gray-300">
          {isExpanded ? text : `${text.slice(0, 200)}...`}
        </p>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-green-400 hover:text-green-500 text-sm mt-2"
        >
          {isExpanded ? 'Show Less' : 'Read More'}
        </button>
      </div>
    );
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
            <FileText className="w-10 h-10 text-green-400" />
            <h1 className="text-3xl font-bold">Resume Generator</h1>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              GitHub Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-3 border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
              placeholder="Enter GitHub username"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={generateResume}
              disabled={loading || !username}
              className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              Generate Resume
            </motion.button>
          </div>

          {resume && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Generated Resume</h2>
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
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={downloadResume}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </motion.button>
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-6 font-mono text-sm whitespace-pre-wrap">
                {resume}
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
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm text-gray-400">{new Date(item.created_at).toLocaleString()}</p>
                        <p className="font-medium">{item.github_username}</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const element = createPDFContent(item.resume_content, item.github_username);
                          html2pdf().set({
                            margin: [0.5, 0.5],
                            filename: `${item.github_username}-resume.pdf`,
                            image: { type: 'jpeg', quality: 0.98 },
                            html2canvas: { scale: 2, useCORS: true },
                            jsPDF: { 
                              unit: 'in', 
                              format: 'a4', 
                              orientation: 'portrait'
                            },
                            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                          }).from(element).save();
                        }}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        Download PDF
                      </motion.button>
                    </div>
                    <ReadMore text={item.resume_content} />
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

export default ResumeGeneratorPage;