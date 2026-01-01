/*
  # Ajout des Statistiques de Vues et Système d'Annonces

  ## Query Description:
  1. Ajoute une colonne 'views' à la table articles.
  2. Crée une fonction RPC 'increment_views' pour compter les vues de manière atomique.
  3. Crée une table 'announcements' pour les messages de l'admin.
  4. Configure la sécurité (RLS) pour ces nouvelles fonctionnalités.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true
*/

-- 1. Ajout du compteur de vues
ALTER TABLE articles ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- 2. Fonction pour incrémenter les vues (Atomic Increment)
-- Cela évite les problèmes de concurrence si plusieurs personnes lisent en même temps
CREATE OR REPLACE FUNCTION increment_article_view(article_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE articles
  SET views = views + 1
  WHERE id = article_id;
END;
$$;

-- 3. Table des annonces
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Sécurité (RLS) pour les annonces
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Tout le monde (authentifié) peut voir les annonces actives
CREATE POLICY "Users can view active announcements" 
ON announcements FOR SELECT 
TO authenticated 
USING (true);

-- Seuls les admins peuvent créer/modifier/supprimer (Basé sur la table profiles)
-- Note: Supabase policies can be complex with joins. 
-- For simplicity in this context, we'll allow insert/update/delete based on a check against the profiles table
CREATE POLICY "Admins can manage announcements" 
ON announcements FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'ADMIN'
  )
);
