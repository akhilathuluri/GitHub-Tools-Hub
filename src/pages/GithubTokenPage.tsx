import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Key, Save, Trash2, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

const GithubTokenPage = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkAuth();
    fetchToken();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) navigate('/auth');
  };

  const fetchToken = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('github_tokens')
        .select('token')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single to handle no rows gracefully

      if (error) throw error;
      if (data) setSavedToken(data.token);
    } catch (err: any) {
      console.error('Error fetching token:', err);
      // Don't show error to user as this is not a critical failure
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Test token validity
      const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Invalid GitHub token');
      }

      // Use upsert with the unique constraint on user_id
      const { error } = await supabase
        .from('github_tokens')
        .upsert(
          { user_id: user.id, token },
          { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          }
        );

      if (error) throw error;

      setSavedToken(token);
      setSuccess('GitHub token saved successfully!');
      setToken('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('github_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedToken(null);
      setSuccess('GitHub token removed successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4">
      <div className="max-w-2xl mx-auto">
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
            <Key className="w-10 h-10 text-purple-400" />
            <h1 className="text-3xl font-bold">GitHub Token Management</h1>
          </div>

          <div className="mb-8">
            <p className="text-gray-300 mb-4">
              To use our GitHub integration features, you need to provide a GitHub personal access token.
              This token will be securely stored and used to access GitHub's API on your behalf.
            </p>
            <a
              href="https://github.com/settings/tokens/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline"
            >
              Generate a new token on GitHub
            </a>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500 text-green-500 p-4 rounded-lg mb-6">
              {success}
            </div>
          )}

          {savedToken ? (
            <div className="mb-6">
              <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-400">Current Token</p>
                  <p className="font-mono">•••••••••••••••••</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Token
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
                placeholder="Enter your GitHub token"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={loading || !token}
                className="mt-4 bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Token
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default GithubTokenPage;