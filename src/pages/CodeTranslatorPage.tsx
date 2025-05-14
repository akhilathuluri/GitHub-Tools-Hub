import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, AlertCircle, Loader2, Copy, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyCOKzTa6TMCkTKe4OQk_bJ46Jp2tLw8FGM');

const LANGUAGES = [
  'JavaScript', 'Python', 'Java', 'C++', 'TypeScript',
  'Ruby', 'Go', 'Swift', 'Rust', 'PHP',
  'C#', 'Kotlin', 'Scala', 'Dart', 'R'
];

const CodeTranslatorPage = () => {
  const navigate = useNavigate();
  const [sourceCode, setSourceCode] = useState('');
  const [fromLang, setFromLang] = useState('JavaScript');
  const [toLang, setToLang] = useState('Python');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [translatedCode, setTranslatedCode] = useState('');
  const [copied, setCopied] = useState(false);

  const translateCode = async () => {
    if (!sourceCode.trim()) {
      setError('Please enter source code');
      return;
    }

    setLoading(true);
    setError('');
    setTranslatedCode('');

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Translate this ${fromLang} code to ${toLang}. Return ONLY the translated code without any explanations or markdown:

${sourceCode}`;
      
      const result = await model.generateContent(prompt);
      const translatedText = result.response.text();
      setTranslatedCode(translatedText.trim());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(translatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const swapLanguages = () => {
    setFromLang(toLang);
    setToLang(fromLang);
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
            <Code2 className="w-10 h-10 text-yellow-400" />
            <h1 className="text-3xl font-bold">Code Translator</h1>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <select
                  value={fromLang}
                  onChange={(e) => setFromLang(e.target.value)}
                  className="bg-gray-700 rounded-lg px-4 py-2 border border-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={swapLanguages}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.button>

                <select
                  value={toLang}
                  onChange={(e) => setToLang(e.target.value)}
                  className="bg-gray-700 rounded-lg px-4 py-2 border border-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <textarea
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                placeholder={`Enter your ${fromLang} code here...`}
                className="w-full h-[400px] bg-gray-700 rounded-lg p-4 font-mono text-sm border border-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none resize-none"
              />

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={translateCode}
                disabled={loading || !sourceCode.trim()}
                className="mt-4 w-full bg-yellow-500 hover:bg-yellow-600 text-black font-medium px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Code2 className="w-5 h-5" />
                    Translate Code
                  </>
                )}
              </motion.button>
            </div>

            {translatedCode && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Translated Code</h2>
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
                </div>
                <div className="bg-gray-700 rounded-lg p-6 h-[400px] font-mono text-sm overflow-auto">
                  <pre className="whitespace-pre-wrap">{translatedCode}</pre>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CodeTranslatorPage;
