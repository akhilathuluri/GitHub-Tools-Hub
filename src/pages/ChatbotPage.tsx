import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, AlertCircle, Loader2, ArrowLeft, Send, Trash2, History } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';

const genAI = new GoogleGenerativeAI('AIzaSyCOKzTa6TMCkTKe4OQk_bJ46Jp2tLw8FGM');

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatHistory {
  repoUrl: string;
  messages: Message[];
  timestamp: number;
}

const ChatbotPage = () => {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [repoContext, setRepoContext] = useState<any>(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = () => {
    const history = localStorage.getItem('chatHistory');
    if (history) {
      setChatHistory(JSON.parse(history));
    }
  };

  const saveChatHistory = (repoUrl: string, messages: Message[]) => {
    const newHistory = [...chatHistory];
    const existingIndex = newHistory.findIndex(h => h.repoUrl === repoUrl);
    
    if (existingIndex !== -1) {
      newHistory[existingIndex] = { repoUrl, messages, timestamp: Date.now() };
    } else {
      newHistory.unshift({ repoUrl, messages, timestamp: Date.now() });
    }
    
    // Keep only last 10 conversations
    const trimmedHistory = newHistory.slice(0, 10);
    setChatHistory(trimmedHistory);
    localStorage.setItem('chatHistory', JSON.stringify(trimmedHistory));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const analyzeRepository = async () => {
    const token = await fetchGitHubToken();
    const urlParts = new URL(repoUrl).pathname.split('/').filter(Boolean);
    if (urlParts.length < 2) throw new Error('Invalid repository URL');
    const [owner, repo] = urlParts;

    // Fetch repository data
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const repoData = await repoResponse.json();

    // Fetch languages
    const languagesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/languages`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const languages = await languagesResponse.json();

    // Fetch recent commits
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const commits = await commitsResponse.json();

    return {
      name: repoData.name,
      description: repoData.description,
      languages,
      lastCommits: commits.slice(0, 5).map((c: any) => ({
        message: c.commit.message,
        date: c.commit.author.date
      }))
    };
  };

  const analyzeRepo = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const context = await analyzeRepository();
      setRepoContext(context);
      
      const welcomeMessage = {
        role: 'assistant' as const,
        content: `I've analyzed the repository "${context.name}". You can ask me questions about:\n\n` +
          `• Code structure and languages (${Object.keys(context.languages).join(', ')})\n` +
          `• Recent commits and changes\n` +
          `• Project dependencies and setup\n\n` +
          `What would you like to know?`
      };
      setMessages([welcomeMessage]);
      saveChatHistory(repoUrl, [welcomeMessage]);
    } catch (err: any) {
      setError(err.message);
      setRepoContext(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim() || !repoContext) return;

    setLoading(true);
    setError('');

    try {
      // Add user message
      const newMessages = [...messages, { role: 'user', content: message }];
      setMessages(newMessages);
      setMessage('');

      // Generate AI response
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are a helpful AI assistant for the GitHub repository "${repoContext.name}".
Repository context:
Name: ${repoContext.name}
Description: ${repoContext.description}
Languages: ${Object.keys(repoContext.languages).join(', ')}
Recent commits: ${JSON.stringify(repoContext.lastCommits)}

Previous messages: ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

User's question: ${message}

Provide a concise and helpful response based on the repository context. Focus on technical details and be specific.`;

      const result = await model.generateContent(prompt);
      const aiMessage = {
        role: 'assistant' as const,
        content: result.response.text()
      };
      
      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      saveChatHistory(repoUrl, updatedMessages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = (history: ChatHistory) => {
    setRepoUrl(history.repoUrl);
    setMessages(history.messages);
    setShowHistory(false);
  };

  const clearHistory = () => {
    localStorage.removeItem('chatHistory');
    setChatHistory([]);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-2xl p-8 shadow-xl"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </motion.button>
              <MessageSquare className="w-10 h-10 text-rose-400" />
              <h1 className="text-3xl font-bold">Repository Chatbot</h1>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-gray-400 hover:text-white"
            >
              <History className="w-5 h-5" />
              {showHistory ? 'Hide History' : 'Show History'}
            </motion.button>
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
                disabled={repoContext !== null}
                className="flex-1 bg-gray-700 rounded-lg px-4 py-3 border border-gray-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition disabled:opacity-50"
                placeholder="https://github.com/username/repository"
              />
              {!repoContext && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={analyzeRepo}
                  disabled={loading || !repoUrl.trim()}
                  className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <MessageSquare className="w-5 h-5" />
                  )}
                  Analyze Repository
                </motion.button>
              )}
            </div>
          </div>

          {showHistory ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Chat History</h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearHistory}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-5 h-5" />
                  Clear History
                </motion.button>
              </div>
              {chatHistory.map((history, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => loadConversation(history)}
                  className="bg-gray-700/50 p-4 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                >
                  <div className="font-medium mb-1">{history.repoUrl}</div>
                  <div className="text-sm text-gray-400">
                    {new Date(history.timestamp).toLocaleDateString()} -{' '}
                    {history.messages.length} messages
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-700 rounded-lg h-[400px] mb-6 flex flex-col">
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-rose-500 text-white'
                          : 'bg-gray-600 text-gray-100'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-4 border-t border-gray-600">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={repoContext ? "Ask a question about the repository..." : "Enter repository URL first"}
                    disabled={loading || !repoUrl || !repoContext}
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                    className="flex-1 bg-gray-600 rounded-lg px-4 py-2 border border-gray-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSubmit}
                    disabled={loading || (!message.trim() && !repoContext) || !repoUrl}
                    className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    {repoContext ? 'Send' : 'Start Chat'}
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ChatbotPage;
