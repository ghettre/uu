/*
  # Add Category Column
  
  Adds a 'category' column to the articles table to allow categorization of content.
  
  ## Query Description:
  1. Adds a text column 'category' to the 'articles' table.
  2. Sets a default value of 'Général'.
  3. Updates existing records to ensure no null values.
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true
  
  ## Structure Details:
  - Table: public.articles
  - Column: category (text)
*/

ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'Général';

-- Update existing articles to have a default category if they are null
UPDATE public.articles 
SET category = 'Général' 
WHERE category IS NULL;
