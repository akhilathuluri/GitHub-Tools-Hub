import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, AlertCircle, ArrowLeft, Lock, Database, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [storageUsed, setStorageUsed] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    checkAuth();
    fetchUserInfo();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) navigate('/auth');
    if (user?.email) setUserEmail(user.email);
  };

  const fetchUserInfo = async () => {
    // In a real app, you'd fetch actual storage usage from your backend
    // This is a mock value for demonstration
    setStorageUsed(Math.floor(Math.random() * 10));
  };

  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess('Password updated successfully');
      setPassword('');
      setConfirmPassword('');
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
            <Settings className="w-10 h-10 text-purple-400" />
            <h1 className="text-3xl font-bold">Settings</h1>
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

          <div className="space-y-6">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-5 h-5 text-gray-400" />
                <h2 className="font-medium">Email Address</h2>
              </div>
              <p className="text-gray-300 ml-8">{userEmail}</p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Database className="w-5 h-5 text-gray-400" />
                <h2 className="font-medium">Storage Usage</h2>
              </div>
              <div className="ml-8">
                <div className="h-2 bg-gray-600 rounded-full mb-2">
                  <div 
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(storageUsed / 500) * 100}%` }}
                  />
                </div>
                <p className="text-gray-300">{storageUsed} MB used of 500 MB</p>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-5 h-5 text-gray-400" />
                <h2 className="font-medium">Update Password</h2>
              </div>
              <div className="space-y-4 ml-8">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
                  placeholder="New Password"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
                  placeholder="Confirm New Password"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUpdatePassword}
                  disabled={loading || !password || !confirmPassword}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Update Password
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
