import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '../lib/supabase';

const genAI = new GoogleGenerativeAI('AIzaSyCOKzTa6TMCkTKe4OQk_bJ46Jp2tLw8FGM');

export const generatePortfolioContent = async (githubUsername: string) => {
  const userData = await getUserData(githubUsername);
  const portfolioData = {
    name: userData.name,
    bio: userData.bio,
    avatar: userData.avatarUrl,
    repos: userData.repositories.slice(0, 6),
    languages: userData.languages,
    contributions: userData.contributions
  };

  const files = generateSourceCode(portfolioData);
  const previewHtml = generateHTMLContent(portfolioData);

  return {
    files,
    previewHtml
  };
};

export const generateSourceCode = (data: any) => {
  const files: { [key: string]: string } = {
    'index.html': generateHTMLContent(data),
    'styles.css': generateStyles(),
    'README.md': generateReadme(data),
    'netlify.toml': generateNetlifyConfig()
  };

  return files;
};

// Helper functions
function generateHTMLContent(data: any) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.name}'s Portfolio</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <div class="container">
            <img src="${data.avatar}" alt="Profile" class="profile-image">
            <h1>${data.name}</h1>
            <p class="bio">${data.bio}</p>
        </div>
    </header>
    
    <main class="container">
        <section class="skills">
            <h2>Technologies</h2>
            <div class="tags">
                ${data.languages.map((lang: string) => `<span class="tag">${lang}</span>`).join('')}
            </div>
        </section>

        <section class="projects">
            <h2>Featured Projects</h2>
            <div class="project-grid">
                ${data.repos.map((repo: any) => `
                    <div class="project-card">
                        <h3>${repo.name}</h3>
                        <p>${repo.description || 'No description available'}</p>
                        <div class="project-footer">
                            <span>${repo.language}</span>
                            <a href="${repo.html_url}" target="_blank">View Project</a>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
    </main>

    <footer>
        <div class="container">
            <p>Created with ❤️ using GitHub Tools Hub</p>
        </div>
    </footer>
</body>
</html>`;
}

function generateReadme(data: any) {
  return `# ${data.name}'s Portfolio

This portfolio was generated using GitHub Tools Hub.

## About Me

${data.bio}

## Technologies

${data.languages.map((lang: string) => `- ${lang}`).join('\n')}

## Featured Projects

${data.repos.map((repo: any) => `
### ${repo.name}
${repo.description || 'No description available'}
- Language: ${repo.language}
- [View Project](${repo.html_url})
`).join('\n')}
`;
}

function generateStyles() {
  return `
:root {
  --primary-color: #6d28d9;
  --bg-color: #111827;
  --text-color: #f3f4f6;
  --card-bg: #1f2937;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background: var(--bg-color);
  color: var(--text-color);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

header {
  background: var(--card-bg);
  padding: 4rem 0;
  text-align: center;
}

.profile-image {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  margin-bottom: 1rem;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.bio {
  max-width: 600px;
  margin: 0 auto;
  color: #9ca3af;
}

section {
  padding: 4rem 0;
}

h2 {
  font-size: 2rem;
  margin-bottom: 2rem;
  position: relative;
  display: inline-block;
}

h2::after {
  content: '';
  position: absolute;
  bottom: -0.5rem;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--primary-color);
  border-radius: 3px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.tag {
  background: var(--primary-color);
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  font-size: 0.9rem;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.project-card {
  background: var(--card-bg);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: transform 0.3s ease;
}

.project-card:hover {
  transform: translateY(-5px);
}

.project-card h3 {
  margin-bottom: 1rem;
  color: var(--primary-color);
}

.project-footer {
  margin-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-footer a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

footer {
  background: var(--card-bg);
  padding: 2rem 0;
  text-align: center;
  margin-top: 4rem;
}

@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }
  
  h1 {
    font-size: 2rem;
  }
  
  .project-grid {
    grid-template-columns: 1fr;
  }
}`;
}

function generateNetlifyConfig() {
  return `[build]
  publish = "."
  
[build.processing]
  skip_processing = false
[build.processing.html]
  pretty_urls = true
[build.processing.css]
  bundle = true
  minify = true
[build.processing.js]
  bundle = true
  minify = true
[build.processing.images]
  compress = true`;
}

async function getUserData(username: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: tokenData } = await supabase
      .from('github_tokens')
      .select('token')
      .eq('user_id', user.id)
      .single();

    if (!tokenData) throw new Error('GitHub token not found');

    // Fetch GitHub user data
    const userResponse = await fetch(`https://api.github.com/users/${username}`, {
      headers: { Authorization: `Bearer ${tokenData.token}` }
    });

    if (!userResponse.ok) throw new Error('GitHub user not found');
    const userData = await userResponse.json();

    // Fetch repositories
    const reposResponse = await fetch(`https://api.github.com/users/${username}/repos`, {
      headers: { Authorization: `Bearer ${tokenData.token}` }
    });

    if (!reposResponse.ok) throw new Error('Failed to fetch repositories');
    const repos = await reposResponse.json();

    return {
      name: userData.name,
      bio: userData.bio,
      avatarUrl: userData.avatar_url,
      repositories: repos,
      languages: repos.reduce((acc: any, repo: any) => {
        if (repo.language && !acc.includes(repo.language)) {
          acc.push(repo.language);
        }
        return acc;
      }, []),
      contributions: repos.reduce((acc: number, repo: any) => acc + repo.stargazers_count, 0)
    };
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    throw error;
  }
}
