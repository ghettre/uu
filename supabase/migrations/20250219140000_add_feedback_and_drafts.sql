/*
  # Ajout du support pour les feedbacks et la mise à jour des articles

  ## Query Description:
  Cette migration ajoute une colonne 'feedback' pour les raisons de rejet et 'updated_at' pour suivre les modifications.
  Elle met également à jour les politiques de sécurité (RLS) pour permettre aux auteurs de modifier leurs propres brouillons.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true

  ## Structure Details:
  - Table: articles
  - New Columns: feedback (TEXT), updated_at (TIMESTAMPTZ)
*/

-- Ajout de la colonne feedback pour les raisons de rejet
ALTER TABLE articles ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Ajout de la colonne updated_at si elle n'existe pas
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'updated_at') THEN
        ALTER TABLE articles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- Mise à jour du trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Politiques de sécurité (RLS) pour permettre l'UPDATE
-- On s'assure que l'auteur peut modifier ses propres articles s'ils ne sont pas publiés (ou s'ils sont en brouillon/rejetés)
DROP POLICY IF EXISTS "Users can update own articles" ON articles;
CREATE POLICY "Users can update own articles"
ON articles FOR UPDATE
USING (auth.uid() = author_id);
