/*
  # Fix GitHub Tokens Table Constraints

  1. Changes
    - Add unique constraint on user_id column to support upsert operations
    - Ensure proper error handling for single row selections

  2. Security
    - Maintains existing RLS policies
*/

-- Add unique constraint on user_id
ALTER TABLE github_tokens
ADD CONSTRAINT github_tokens_user_id_key UNIQUE (user_id);