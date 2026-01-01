import React, { createContext, useContext, useState, useEffect } from 'react';
import { Article, ArticleStatus, Comment, LikeStatus, Category, Announcement } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface BlogContextType {
  articles: Article[];
  announcements: Announcement[];
  loading: boolean;
  getArticleById: (id: string) => Promise<Article | null>;
  saveDraft: (data: Partial<Article> & { id?: string }) => Promise<string>;
  submitArticle: (id: string) => Promise<void>;
  updateArticleStatus: (id: string, status: ArticleStatus, feedback?: string) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  getArticlesByAuthor: (authorId: string) => Article[];
  getPublishedArticles: () => Article[];
  getAllArticlesForAdmin: () => Article[];
  refreshArticles: () => Promise<void>;
  
  // Stats
  incrementViewCount: (articleId: string) => Promise<void>;

  // Social features
  getComments: (articleId: string) => Promise<Comment[]>;
  addComment: (articleId: string, content: string) => Promise<Comment>;
  getLikeStatus: (articleId: string) => Promise<LikeStatus>;
  toggleLike: (articleId: string) => Promise<LikeStatus>;

  // Announcements
  createAnnouncement: (content: string) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
}

const BlogContext = createContext<BlogContextType | undefined>(undefined);

export const BlogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select(`
          *,
          profiles:author_id (name)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formattedArticles: Article[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        excerpt: item.excerpt,
        content: item.content,
        imageUrl: item.image_url,
        authorId: item.author_id,
        authorName: item.profiles?.name || 'Inconnu',
        status: item.status,
        category: item.category || 'Autre',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        feedback: item.feedback,
        views: item.views || 0,
      }));

      setArticles(formattedArticles);
    } catch (err) {
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAnnouncements(data.map((item: any) => ({
        id: item.id,
        content: item.content,
        createdAt: item.created_at,
        createdBy: item.created_by,
        isActive: item.is_active
      })));
    } catch (err) {
      console.error('Error fetching announcements:', err);
    }
  };

  useEffect(() => {
    fetchArticles();
    fetchAnnouncements();

    const articlesChannel = supabase
      .channel('articles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'articles' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
             fetchArticles();
          }
        }
      )
      .subscribe();

    const announcementsChannel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => fetchAnnouncements()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(articlesChannel);
      supabase.removeChannel(announcementsChannel);
    };
  }, [user]);

  const getArticleById = async (id: string): Promise<Article | null> => {
    const existing = articles.find(a => a.id === id);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('articles')
      .select(`*, profiles:author_id (name)`)
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      imageUrl: data.image_url,
      authorId: data.author_id,
      authorName: data.profiles?.name || 'Inconnu',
      status: data.status,
      category: data.category || 'Autre',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      feedback: data.feedback,
      views: data.views || 0,
    };
  };

  const incrementViewCount = async (articleId: string) => {
    try {
      await supabase.rpc('increment_view_count', { article_id: articleId });
      // Optimistic update locally not strictly necessary for views as it's passive, 
      // but we can update the local state to reflect it instantly if needed.
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, views: a.views + 1 } : a));
    } catch (error) {
      console.error("Error incrementing view count", error);
    }
  };

  const saveDraft = async (data: Partial<Article> & { id?: string }): Promise<string> => {
    if (!user) throw new Error("Non connecté");

    const articleData = {
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      image_url: data.imageUrl,
      category: data.category,
      author_id: user.id,
      status: 'DRAFT',
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { error } = await supabase
        .from('articles')
        .update(articleData)
        .eq('id', data.id);
      
      if (error) throw error;
      
      setArticles(prev => prev.map(a => a.id === data.id ? { 
        ...a, 
        ...data, 
        category: data.category || a.category,
        status: 'DRAFT', 
        updatedAt: articleData.updated_at 
      } : a));
      return data.id;
    } else {
      const { data: newArticle, error } = await supabase
        .from('articles')
        .insert(articleData)
        .select()
        .single();
      
      if (error) throw error;
      fetchArticles();
      return newArticle.id;
    }
  };

  const submitArticle = async (id: string) => {
    const { error } = await supabase
      .from('articles')
      .update({ status: 'PENDING', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    setArticles(prev => prev.map(a => a.id === id ? { ...a, status: 'PENDING', updatedAt: new Date().toISOString() } : a));
  };

  const updateArticleStatus = async (id: string, status: ArticleStatus, feedback?: string) => {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (feedback !== undefined) {
      updateData.feedback = feedback;
    }

    setArticles(prev => prev.map(a => a.id === id ? { ...a, status, feedback: feedback || a.feedback, updatedAt: updateData.updated_at } : a));

    const { error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', id);

    if (error) {
      fetchArticles();
      throw error;
    }
  };

  const deleteArticle = async (id: string) => {
    setArticles(prev => prev.filter(a => a.id !== id));
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) {
      fetchArticles();
      throw error;
    }
  };

  // --- SOCIAL FEATURES ---

  const getComments = async (articleId: string): Promise<Comment[]> => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        article_id,
        author_id,
        profiles:author_id (name, avatar_url)
      `)
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data.map((item: any) => ({
      id: item.id,
      content: item.content,
      articleId: item.article_id,
      authorId: item.author_id,
      authorName: item.profiles?.name || 'Utilisateur',
      authorAvatar: item.profiles?.avatar_url,
      createdAt: item.created_at,
    }));
  };

  const addComment = async (articleId: string, content: string): Promise<Comment> => {
    if (!user) throw new Error("Vous devez être connecté pour commenter");

    const { data, error } = await supabase
      .from('comments')
      .insert({
        content,
        article_id: articleId,
        author_id: user.id,
      })
      .select(`
        id,
        content,
        created_at,
        article_id,
        author_id,
        profiles:author_id (name, avatar_url)
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      content: data.content,
      articleId: data.article_id,
      authorId: data.author_id,
      authorName: data.profiles?.name || user.name,
      authorAvatar: data.profiles?.avatar_url,
      createdAt: data.created_at,
    };
  };

  const getLikeStatus = async (articleId: string): Promise<LikeStatus> => {
    const { count, error: countError } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('article_id', articleId);

    if (countError) throw countError;

    let isLiked = false;
    if (user) {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('article_id', articleId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!error && data) isLiked = true;
    }

    return { count: count || 0, isLiked };
  };

  const toggleLike = async (articleId: string): Promise<LikeStatus> => {
    if (!user) throw new Error("Vous devez être connecté pour aimer");

    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('article_id', articleId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingLike) {
      await supabase
        .from('likes')
        .delete()
        .eq('article_id', articleId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('likes')
        .insert({
          article_id: articleId,
          user_id: user.id,
        });
    }

    return getLikeStatus(articleId);
  };

  // --- ANNOUNCEMENTS ---

  const createAnnouncement = async (content: string) => {
    if (!user || user.role !== 'ADMIN') throw new Error("Non autorisé");

    const { error } = await supabase
      .from('announcements')
      .insert({
        content,
        created_by: user.id,
        is_active: true
      });

    if (error) throw error;
    fetchAnnouncements();
  };

  const deleteAnnouncement = async (id: string) => {
    if (!user || user.role !== 'ADMIN') throw new Error("Non autorisé");

    const { error } = await supabase
      .from('announcements')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    fetchAnnouncements();
  };

  const getArticlesByAuthor = (authorId: string) => articles.filter(art => art.authorId === authorId);
  const getPublishedArticles = () => articles.filter(art => art.status === 'PUBLISHED');
  const getAllArticlesForAdmin = () => articles;

  return (
    <BlogContext.Provider value={{ 
      articles, 
      announcements,
      loading,
      getArticleById,
      saveDraft,
      submitArticle,
      updateArticleStatus, 
      deleteArticle,
      getArticlesByAuthor,
      getPublishedArticles,
      getAllArticlesForAdmin,
      refreshArticles: fetchArticles,
      getComments,
      addComment,
      getLikeStatus,
      toggleLike,
      incrementViewCount,
      createAnnouncement,
      deleteAnnouncement
    }}>
      {children}
    </BlogContext.Provider>
  );
};

export const useBlog = () => {
  const context = useContext(BlogContext);
  if (context === undefined) {
    throw new Error('useBlog must be used within a BlogProvider');
  }
  return context;
};
