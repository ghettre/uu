/*
  # Correction Schéma et Configuration des Rôles
  
  ## Description
  Ce script nettoie les anciens triggers conflictuels et réinstalle proprement la structure de la base de données.
  Il implémente la logique métier : nadifioussama9@gmail.com = ADMIN, autres = WRITER.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "High"
  - Requires-Backup: false
  - Reversible: true
*/

-- 1. Nettoyage des anciens triggers et fonctions pour éviter l'erreur "already exists"
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Création de la table profiles (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'WRITER' CHECK (role IN ('ADMIN', 'WRITER')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Activation RLS sur profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Création de la table articles (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  image_url TEXT,
  author_id UUID REFERENCES public.profiles(id) NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Activation RLS sur articles
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- 4. Fonction automatique pour assigner les rôles à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    CASE 
      WHEN new.email = 'nadifioussama9@gmail.com' THEN 'ADMIN'
      ELSE 'WRITER'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Création du Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Politiques de Sécurité (RLS)

-- PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ARTICLES
-- Lecture : Tout le monde voit les publiés. Auteurs voient les leurs. Admins voient tout.
DROP POLICY IF EXISTS "Published articles are viewable by everyone" ON public.articles;
CREATE POLICY "Published articles are viewable by everyone" ON public.articles
  FOR SELECT USING (status = 'PUBLISHED');

DROP POLICY IF EXISTS "Authors can view own articles" ON public.articles;
CREATE POLICY "Authors can view own articles" ON public.articles
  FOR SELECT USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Admins can view all articles" ON public.articles;
CREATE POLICY "Admins can view all articles" ON public.articles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- Insertion : Les auteurs authentifiés peuvent écrire
DROP POLICY IF EXISTS "Authors can insert articles" ON public.articles;
CREATE POLICY "Authors can insert articles" ON public.articles
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Mise à jour : Auteurs (leurs articles), Admins (tout)
DROP POLICY IF EXISTS "Authors can update own articles" ON public.articles;
CREATE POLICY "Authors can update own articles" ON public.articles
  FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Admins can update all articles" ON public.articles;
CREATE POLICY "Admins can update all articles" ON public.articles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- Suppression : Auteurs (leurs articles), Admins (tout)
DROP POLICY IF EXISTS "Authors can delete own articles" ON public.articles;
CREATE POLICY "Authors can delete own articles" ON public.articles
  FOR DELETE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Admins can delete all articles" ON public.articles;
CREATE POLICY "Admins can delete all articles" ON public.articles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );
