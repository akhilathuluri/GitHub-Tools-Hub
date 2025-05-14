/*
  # Initial Schema Setup

  1. New Tables
    - `github_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `token` (text, encrypted)
      - `created_at` (timestamp)
    
    - `documentation_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `repo_url` (text)
      - `documentation` (text)
      - `repo_analytics` (jsonb)
      - `generated_at` (timestamp)
      - `created_at` (timestamp)
    
    - `resume_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `github_username` (text)
      - `resume_content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- GitHub Tokens table
CREATE TABLE github_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  token text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE github_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tokens"
  ON github_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Documentation History table
CREATE TABLE documentation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  repo_url text NOT NULL,
  documentation text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documentation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own documentation"
  ON documentation_history
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Resume History table
CREATE TABLE resume_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  github_username text NOT NULL,
  resume_content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE resume_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own resumes"
  ON resume_history
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);