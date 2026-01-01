import React, { useState, useEffect } from 'react';
import { useBlog } from '../context/BlogContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Comment } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, MessageSquare, Loader2, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface CommentSectionProps {
  articleId: string;
}

export function CommentSection({ articleId }: CommentSectionProps) {
  const { getComments, addComment } = useBlog();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');

  const fetchComments = async () => {
    try {
      const data = await getComments(articleId);
      setComments(data);
    } catch (error) {
      console.error("Error fetching comments", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();

    // Realtime subscription for new comments
    const channel = supabase
      .channel(`comments-${articleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `article_id=eq.${articleId}` },
        (payload) => {
          // We could just push the payload, but we need the author profile info which isn't in the payload
          // So simpler to just refetch for now to get the join
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [articleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      addToast("Connectez-vous pour commenter", "info");
      return;
    }

    setSubmitting(true);
    try {
      await addComment(articleId, newComment);
      setNewComment('');
      addToast("Commentaire ajouté !", "success");
      fetchComments(); // Refresh list immediately
    } catch (error) {
      addToast("Erreur lors de l'envoi", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-12 pt-10 border-t border-gray-100">
      <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-indigo-600" />
        Commentaires <span className="text-gray-400 text-lg font-normal">({comments.length})</span>
      </h3>

      {/* Comment Form */}
      <div className="mb-10">
        {user ? (
          <form onSubmit={handleSubmit} className="flex gap-4">
            <div className="flex-shrink-0 hidden sm:block">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-grow relative">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Partagez votre avis..."
                className="w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 min-h-[100px] p-4 resize-none text-gray-700 placeholder-gray-400"
              />
              <div className="absolute bottom-3 right-3">
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4 mr-2" />}
                  Envoyer
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
            <p className="text-gray-600 mb-4">Connectez-vous pour rejoindre la discussion.</p>
            <div className="flex justify-center gap-4">
              <Link to="/login" className="text-indigo-600 font-medium hover:underline">Se connecter</Link>
              <span className="text-gray-300">|</span>
              <Link to="/signup" className="text-indigo-600 font-medium hover:underline">S'inscrire</Link>
            </div>
          </div>
        )}
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-8">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex-shrink-0">
                {comment.authorAvatar ? (
                  <img src={comment.authorAvatar} alt={comment.authorName} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 border border-gray-200">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <div className="bg-gray-50 rounded-2xl p-4 rounded-tl-none">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900">{comment.authorName}</span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto text-gray-200 mb-3" />
          <p>Aucun commentaire pour le moment. Soyez le premier !</p>
        </div>
      )}
    </div>
  );
}
