import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, AlertCircle, Loader2, ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';

const genAI = new GoogleGenerativeAI('AIzaSyCOKzTa6TMCkTKe4OQk_bJ46Jp2tLw8FGM');

interface LearningPath {
  currentLevel: string;
  recommendedTechnologies: string[];
  learningPath: {
    beginner: string[];
    intermediate: string[];
    advanced: string[];
  };
  resources: {
    title: string;
    url: string;
    type: string;
  }[];
  estimatedTimeframes: {
    beginner: string;
    intermediate: string;
    advanced: string;
  };
}

const LearningPathPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);

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

  const analyzeTechnologies = async () => {
    setLoading(true);
    setError('');
    setLearningPath(null);

    try {
      const token = await fetchGitHubToken();
      
      // Fetch user's repositories
      const reposResponse = await fetch(`https://api.github.com/users/${username}/repos`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!reposResponse.ok) throw new Error('Failed to fetch repositories');
      const repos = await reposResponse.json();

      // Analyze languages and technologies
      const technologies = new Set();
      const languages = new Set();
      
      for (const repo of repos) {
        if (repo.language) languages.add(repo.language);
        
        // Fetch package.json if it exists
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

      // Generate learning path using Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Based on this GitHub user's technology stack, create a personalized learning path. 
The user works with these languages: ${Array.from(languages).join(', ')}
And these technologies: ${Array.from(technologies).join(', ')}

Return a valid JSON object with the following structure (no markdown formatting, just pure JSON):

{
  "currentLevel": "beginner or intermediate or advanced",
  "recommendedTechnologies": ["tech1", "tech2"],
  "learningPath": {
    "beginner": ["step1", "step2"],
    "intermediate": ["step1", "step2"],
    "advanced": ["step1", "step2"]
  },
  "resources": [
    {
      "title": "Resource name",
      "url": "valid URL",
      "type": "documentation or course or tutorial"
    }
  ],
  "estimatedTimeframes": {
    "beginner": "timeframe",
    "intermediate": "timeframe",
    "advanced": "timeframe"
  }
}`;

      const result = await model.generateContent(prompt);
      let pathData;
      try {
        // Clean the response and parse JSON
        const cleanText = result.response.text().replace(/```json\s*|\s*```/g, '').trim();
        pathData = JSON.parse(cleanText);
      } catch (jsonError) {
        throw new Error('Failed to parse AI response as JSON');
      }
      setLearningPath(pathData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPath = () => {
    if (!learningPath) return;

    const content = `# Personalized Learning Path for ${username}

Current Level: ${learningPath.currentLevel}

## Recommended Technologies
${learningPath.recommendedTechnologies.join(', ')}

## Learning Path

### Beginner Level (${learningPath.estimatedTimeframes.beginner})
${learningPath.learningPath.beginner.map(step => `- ${step}`).join('\n')}

### Intermediate Level (${learningPath.estimatedTimeframes.intermediate})
${learningPath.learningPath.intermediate.map(step => `- ${step}`).join('\n')}

### Advanced Level (${learningPath.estimatedTimeframes.advanced})
${learningPath.learningPath.advanced.map(step => `- ${step}`).join('\n')}

## Recommended Resources
${learningPath.resources.map(resource => `- [${resource.title}](${resource.url}) (${resource.type})`).join('\n')}
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${username}-learning-path.md`;
    a.click();
    window.URL.revokeObjectURL(url);
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
            <BookOpen className="w-10 h-10 text-teal-400" />
            <h1 className="text-3xl font-bold">Learning Path Generator</h1>
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
              className="w-full bg-gray-700 rounded-lg px-4 py-3 border border-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
              placeholder="Enter GitHub username"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={analyzeTechnologies}
              disabled={loading || !username}
              className="mt-4 bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
              Generate Learning Path
            </motion.button>
          </div>

          {learningPath && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Your Learning Path</h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={downloadPath}
                  className="flex items-center gap-2 text-teal-400 hover:text-teal-300"
                >
                  <Download className="w-5 h-5" />
                  Download Path
                </motion.button>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-lg font-medium mb-2">Current Level: {learningPath.currentLevel}</div>
                <div className="text-sm text-gray-300">
                  Recommended Technologies: {learningPath.recommendedTechnologies.join(', ')}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                  <div key={level} className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-medium capitalize mb-2">{level}</h3>
                    <div className="text-sm text-gray-400 mb-2">
                      {learningPath.estimatedTimeframes[level]}
                    </div>
                    <ul className="space-y-2">
                      {learningPath.learningPath[level].map((step, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-teal-400 mt-1">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">Recommended Resources</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {learningPath.resources.map((resource, i) => (
                    <a
                      key={i}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 bg-gray-600/50 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <ExternalLink className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">{resource.title}</div>
                        <div className="text-sm text-gray-400 capitalize">{resource.type}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default LearningPathPage;
