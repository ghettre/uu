/*
  # Initialisation du Schéma Blog

  ## Description de la requête :
  Cette migration crée les tables nécessaires pour le blog et configure la sécurité.
  Elle inclut une logique spéciale pour définir 'nadifioussama9@gmail.com' comme ADMIN.

  ## Détails de la structure :
  - Table `profiles` : Étend la table auth.users avec le rôle (ADMIN/WRITER) et le nom.
  - Table `articles` : Stocke le contenu du blog.
  - Trigger `handle_new_user` : Crée automatiquement le profil à l'inscription.

  ## Implications de sécurité :
  - RLS activé sur toutes les tables.
  - Politiques strictes pour séparer les droits Admin/Rédacteur.
*/

-- Création de la table profiles
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  role text default 'WRITER' check (role in ('ADMIN', 'WRITER')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activation RLS profiles
alter table public.profiles enable row level security;

-- Création de la table articles
create table public.articles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  excerpt text,
  content text,
  image_url text,
  status text default 'PENDING' check (status in ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED')),
  author_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activation RLS articles
alter table public.articles enable row level security;

-- POLITIQUES DE SÉCURITÉ (RLS)

-- Profiles : Tout le monde peut voir, seul l'utilisateur peut modifier le sien
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Articles :
-- 1. Tout le monde voit les articles PUBLIÉS
create policy "Published articles are viewable by everyone" on public.articles
  for select using (status = 'PUBLISHED');

-- 2. Les auteurs voient leurs propres articles (quel que soit le statut)
create policy "Authors can view own articles" on public.articles
  for select using (auth.uid() = author_id);

-- 3. Les ADMINS voient TOUS les articles
create policy "Admins can view all articles" on public.articles
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'ADMIN'
    )
  );

-- 4. Les rédacteurs peuvent créer des articles
create policy "Writers can insert articles" on public.articles
  for insert with check (auth.uid() = author_id);

-- 5. Les auteurs peuvent modifier leurs propres articles
create policy "Authors can update own articles" on public.articles
  for update using (auth.uid() = author_id);

-- 6. Les ADMINS peuvent modifier n'importe quel article (pour valider/rejeter)
create policy "Admins can update any article" on public.articles
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'ADMIN'
    )
  );

-- 7. Les auteurs peuvent supprimer leurs articles
create policy "Authors can delete own articles" on public.articles
  for delete using (auth.uid() = author_id);

-- 8. Les ADMINS peuvent supprimer n'importe quel article
create policy "Admins can delete any article" on public.articles
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'ADMIN'
    )
  );

-- TRIGGER POUR GÉRER LES RÔLES AUTOMATIQUEMENT
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    case 
      when new.email = 'nadifioussama9@gmail.com' then 'ADMIN'
      else 'WRITER'
    end,
    'https://ui-avatars.com/api/?name=' || replace(new.raw_user_meta_data->>'name', ' ', '+')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
