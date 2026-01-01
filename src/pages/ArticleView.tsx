import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBlog } from '../context/BlogContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Calendar, Clock, Loader2, Check, X, AlertCircle, Share2, Eye } from 'lucide-react';
import { Article } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { LikeButton } from '../components/LikeButton';
import { CommentSection } from '../components/CommentSection';
import { CategoryBadge } from '../components/CategoryBadge';

export function ArticleView() {
  const { id } = useParams<{ id: string }>();
  const { getArticleById, updateArticleStatus, incrementViewCount } = useBlog();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const viewIncremented = useRef(false);
  
  // Modal State for Rejection
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (id) {
      getArticleById(id).then(data => {
        setArticle(data);
        setLoading(false);
      });

      // Increment view count (only once per mount)
      if (!viewIncremented.current) {
        incrementViewCount(id);
        viewIncremented.current = true;
      }
    }
  }, [id, getArticleById, incrementViewCount]);

  const handleApprove = async () => {
    if (!article) return;
    if (confirm('Voulez-vous vraiment publier cet article ?')) {
      try {
        await updateArticleStatus(article.id, 'PUBLISHED');
        addToast("Article publié avec succès !", "success");
        setArticle(prev => prev ? { ...prev, status: 'PUBLISHED' } : null);
      } catch (e) {
        addToast("Erreur lors de la publication", "error");
      }
    }
  };

  const submitReject = async () => {
    if (!article) return;
    if (rejectReason.trim()) {
      try {
        await updateArticleStatus(article.id, 'REJECTED', rejectReason);
        addToast("Article rejeté avec feedback envoyé", "info");
        setRejectModalOpen(false);
        setArticle(prev => prev ? { ...prev, status: 'REJECTED', feedback: rejectReason } : null);
      } catch (e) {
        addToast("Erreur lors du rejet", "error");
      }
    } else {
      addToast("Veuillez donner une raison", "warning");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast("Lien copié dans le presse-papier !", "success");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Article introuvable</h1>
        <p className="text-gray-500 mb-6">L'article que vous cherchez n'existe pas ou a été supprimé.</p>
        <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Admin Review Bar */}
      {isAdmin && article.status === 'PENDING' && (
        <div className="sticky top-16 z-30 bg-indigo-900 text-white px-4 py-3 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <span className="font-medium">Cet article est en attente de validation.</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setRejectModalOpen(true)}
                className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 border border-red-400 text-sm font-medium rounded-md text-red-100 hover:bg-red-800 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                Rejeter
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-900 bg-green-100 hover:bg-green-200 transition-colors"
              >
                <Check className="w-4 h-4 mr-2" />
                Approuver et Publier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Image */}
      {article.imageUrl && (
        <div className="w-full h-[40vh] md:h-[50vh] relative">
          <img 
            src={article.imageUrl} 
            alt={article.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 border border-gray-100">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <Link 
                to={user ? "/dashboard" : "/"} 
                className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                {user ? "Retour au tableau de bord" : "Retour aux articles"}
              </Link>
              <div className="flex gap-2">
                <CategoryBadge category={article.category} />
                {user && <StatusBadge status={article.status} />}
              </div>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-6 border-b border-gray-100 pb-6">
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                    {article.authorName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">{article.authorName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <time dateTime={article.createdAt}>
                    {format(new Date(article.createdAt), 'd MMMM yyyy', { locale: fr })}
                  </time>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{Math.max(1, Math.ceil(article.content.length / 1000))} min de lecture</span>
                </div>
                <div className="flex items-center gap-1.5" title="Nombre de vues">
                  <Eye className="w-4 h-4" />
                  <span>{article.views || 0} vues</span>
                </div>
              </div>

              {/* Social Actions (Top) */}
              <div className="flex items-center gap-2">
                <LikeButton articleId={article.id} />
                <button 
                  onClick={handleShare}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                  title="Partager"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-lg prose-indigo max-w-none text-gray-800">
            <p className="lead text-xl text-gray-500 italic mb-8 border-l-4 border-indigo-500 pl-4">
              {article.excerpt}
            </p>
            <div className="whitespace-pre-wrap font-serif leading-relaxed">
              {article.content}
            </div>
          </div>

          {/* Comments Section */}
          <CommentSection articleId={article.id} />
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setRejectModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <X className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Rejeter l'article
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-4">
                      Veuillez indiquer la raison du rejet pour aider l'auteur à améliorer son article.
                    </p>
                    <textarea
                      rows={4}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                      placeholder="Ex: Le contenu ne respecte pas nos directives..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm"
                  onClick={submitReject}
                >
                  Confirmer le rejet
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  onClick={() => setRejectModalOpen(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
