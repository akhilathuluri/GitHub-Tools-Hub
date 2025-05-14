import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, AlertCircle, Loader2, ArrowLeft, Check, RefreshCw, Code } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';

const genAI = new GoogleGenerativeAI('AIzaSyCOKzTa6TMCkTKe4OQk_bJ46Jp2tLw8FGM');

interface Challenge {
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  requirements: string[];
  startingCode: string;
  hints: string[];
  testCases: Array<{
    input: string;
    output: string;
  }>;
  timeLimit: string;
}

const ChallengeGeneratorPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [solution, setSolution] = useState('');

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

  const analyzeUserProfile = async () => {
    const token = await fetchGitHubToken();
    const reposResponse = await fetch(`https://api.github.com/users/${username}/repos`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!reposResponse.ok) throw new Error('Failed to fetch repositories');
    const repos = await reposResponse.json();

    const languages = new Set();
    const technologies = new Set();
    
    for (const repo of repos) {
      if (repo.language) languages.add(repo.language);
      
      try {
        const packageJsonResponse = await fetch(
          `https://api.github.com/repos/${username}/${repo.name}/contents/package.json`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (packageJsonResponse.ok) {
          const { content } = await packageJsonResponse.json();
          const packageJson = JSON.parse(atob(content));
          if (packageJson.dependencies) {
            Object.keys(packageJson.dependencies).forEach(dep => technologies.add(dep));
          }
        }
      } catch (e) {
        // Ignore errors for repositories without package.json
      }
    }

    return {
      languages: Array.from(languages),
      technologies: Array.from(technologies),
      repoCount: repos.length
    };
  };

  const generateChallenge = async () => {
    if (!username.trim()) {
      setError('Please enter a GitHub username');
      return;
    }

    setLoading(true);
    setError('');
    setChallenge(null);
    setShowSolution(false);
    setSolution('');

    try {
      const profile = await analyzeUserProfile();
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Based on this GitHub profile, create a coding challenge:
Languages: ${profile.languages.join(', ')}
Technologies: ${profile.technologies.join(', ')}
Repository count: ${profile.repoCount}

Return ONLY a JSON object without any extra text, markdown formatting, or code block syntax. The JSON must have this exact structure:

{
  "title": "string",
  "difficulty": "Easy",
  "description": "string",
  "requirements": ["string"],
  "startingCode": "string",
  "hints": ["string"],
  "testCases": [{"input": "string", "output": "string"}],
  "timeLimit": "string"
}

Make it match their skill level.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Clean the response text
      const cleanedText = responseText
        .replace(/```json\s*|\s*```/g, '') // Remove code blocks
        .replace(/[\u201C\u201D]/g, '"')   // Replace smart quotes
        .replace(/[\u2018\u2019]/g, "'")   // Replace smart single quotes
        .trim();

      try {
        const challengeData = JSON.parse(cleanedText);
        
        // Validate required fields
        const requiredFields = ['title', 'difficulty', 'description', 'requirements', 'startingCode', 'hints', 'testCases', 'timeLimit'];
        const missingFields = requiredFields.filter(field => !challengeData[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Invalid challenge format: missing ${missingFields.join(', ')}`);
        }

        setChallenge(challengeData);
      } catch (parseError) {
        console.error('Parse Error:', parseError);
        console.error('Raw Response:', responseText);
        console.error('Cleaned Text:', cleanedText);
        throw new Error('Failed to parse challenge data. Please try again.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const revealSolution = async () => {
    if (!challenge) return;

    setLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Provide a solution to this coding challenge:

${challenge.description}

Requirements:
${challenge.requirements.join('\n')}

Test Cases:
${challenge.testCases.map(tc => `Input: ${tc.input}\nOutput: ${tc.output}`).join('\n')}

Provide only the solution code with comments explaining the approach.`;

      const result = await model.generateContent(prompt);
      setSolution(result.response.text());
      setShowSolution(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
            <Brain className="w-10 h-10 text-indigo-400" />
            <h1 className="text-3xl font-bold">Coding Challenge Generator</h1>
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
            <div className="flex gap-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 bg-gray-700 rounded-lg px-4 py-3 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                placeholder="Enter GitHub username"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={generateChallenge}
                disabled={loading || !username}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-lg flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
                Generate Challenge
              </motion.button>
            </div>
          </div>

          {challenge && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{challenge.title}</h2>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  challenge.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                  challenge.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {challenge.difficulty}
                </span>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-gray-300">{challenge.description}</p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Requirements</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {challenge.requirements.map((req, i) => (
                      <li key={i} className="text-gray-300">{req}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Starting Code</h3>
                  <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                    <code className="text-gray-300">{challenge.startingCode}</code>
                  </pre>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Test Cases</h3>
                  <div className="space-y-2">
                    {challenge.testCases.map((tc, i) => (
                      <div key={i} className="bg-gray-800 p-3 rounded-lg">
                        <div className="text-gray-400">Input: <span className="text-gray-300">{tc.input}</span></div>
                        <div className="text-gray-400">Expected Output: <span className="text-gray-300">{tc.output}</span></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Hints</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {challenge.hints.map((hint, i) => (
                      <li key={i} className="text-gray-300">{hint}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>Estimated Time: {challenge.timeLimit}</span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={revealSolution}
                    disabled={loading}
                    className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Code className="w-4 h-4" />
                    )}
                    {showSolution ? 'Hide Solution' : 'Show Solution'}
                  </motion.button>
                </div>

                {showSolution && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Solution</h3>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                      <code className="text-gray-300">{solution}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ChallengeGeneratorPage;
