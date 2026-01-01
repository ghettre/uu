/*
  # Ajout des fonctionnalités sociales (Commentaires et Likes)

  ## Structure Details:
  1. Table `comments`
     - id (uuid, primary key)
     - content (text)
     - article_id (uuid, foreign key -> articles)
     - author_id (uuid, foreign key -> profiles)
     - created_at (timestamp)
  
  2. Table `likes`
     - id (uuid, primary key)
     - article_id (uuid, foreign key -> articles)
     - user_id (uuid, foreign key -> profiles)
     - created_at (timestamp)
     - Contrainte UNIQUE (article_id, user_id) pour empêcher les doubles likes

  ## Security Implications:
  - RLS activé sur les deux tables.
  - Lecture : Publique.
  - Écriture : Authentifié uniquement.
  - Suppression : Auteur ou Admin uniquement.
*/

-- Create Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Likes Table
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(article_id, user_id)
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Policies for Comments
CREATE POLICY "Comments are viewable by everyone" 
  ON public.comments FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert comments" 
  ON public.comments FOR INSERT 
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments" 
  ON public.comments FOR DELETE 
  USING (auth.uid() = author_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ));

-- Policies for Likes
CREATE POLICY "Likes are viewable by everyone" 
  ON public.likes FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert likes" 
  ON public.likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
  ON public.likes FOR DELETE 
  USING (auth.uid() = user_id);
