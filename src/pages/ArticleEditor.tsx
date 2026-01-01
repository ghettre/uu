import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useBlog } from '../context/BlogContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Loader2, Image as ImageIcon, Eye, Send, Save, Check, AlertCircle, Tag } from 'lucide-react';
import { CATEGORIES, Category } from '../types';
import { CategoryBadge } from '../components/CategoryBadge';

interface ArticleFormData {
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  category: Category;
}

export function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm<ArticleFormData>({
    defaultValues: {
      category: 'Autre'
    }
  });
  const navigate = useNavigate();
  const { saveDraft, submitArticle, getArticleById } = useBlog();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [articleId, setArticleId] = useState<string | null>(id || null);
  const [status, setStatus] = useState<string>('DRAFT');

  // Watch fields for auto-save
  const watchedData = watch();
  const imageUrl = watchedData.imageUrl;
  const [validImage, setValidImage] = useState(false);

  // Prevent closing window if saving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saving || (isDirty && !lastSaved)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saving, isDirty, lastSaved]);

  // Charger les données si ID présent
  useEffect(() => {
    if (id) {
      setLoading(true);
      getArticleById(id).then(article => {
        if (article) {
          if (article.status === 'PENDING' || article.status === 'PUBLISHED') {
            addToast("Cet article est verrouillé car il est publié ou en cours de revue.", "warning");
            navigate('/dashboard');
            return;
          }
          setValue('title', article.title);
          setValue('excerpt', article.excerpt);
          setValue('content', article.content);
          setValue('imageUrl', article.imageUrl || '');
          setValue('category', article.category);
          setStatus(article.status);
          setArticleId(article.id);
        }
        setLoading(false);
      });
    }
  }, [id, getArticleById, setValue, navigate, addToast]);

  // Validation image
  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => setValidImage(true);
      img.onerror = () => setValidImage(false);
    } else {
      setValidImage(false);
    }
  }, [imageUrl]);

  // Auto-save Logic
  useEffect(() => {
    const autoSave = async () => {
      if (!isDirty || !watchedData.title) return;

      setSaving(true);
      try {
        const newId = await saveDraft({
          id: articleId || undefined,
          title: watchedData.title,
          excerpt: watchedData.excerpt,
          content: watchedData.content,
          imageUrl: watchedData.imageUrl,
          category: watchedData.category
        });
        
        if (!articleId && newId) {
          setArticleId(newId);
          window.history.replaceState(null, '', `/editor/${newId}`);
        }
        
        setLastSaved(new Date());
      } catch (error) {
        console.error("Erreur auto-save", error);
      } finally {
        setSaving(false);
      }
    };

    const timeoutId = setTimeout(autoSave, 2000);
    return () => clearTimeout(timeoutId);
  }, [watchedData, articleId, isDirty, saveDraft]);

  const handleManualSave = async () => {
    if (!watchedData.title) {
      addToast("Le titre est requis pour sauvegarder.", "warning");
      return;
    }
    setSaving(true);
    try {
      const newId = await saveDraft({
        id: articleId || undefined,
        title: watchedData.title,
        excerpt: watchedData.excerpt,
        content: watchedData.content,
        imageUrl: watchedData.imageUrl,
        category: watchedData.category
      });
      if (!articleId && newId) {
        setArticleId(newId);
        window.history.replaceState(null, '', `/editor/${newId}`);
      }
      setLastSaved(new Date());
      addToast("Brouillon sauvegardé avec succès", "success");
    } catch (e) {
      addToast("Erreur lors de la sauvegarde", "error");
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (data: ArticleFormData) => {
    if (!articleId) {
      await handleManualSave();
    }
    
    if (confirm("Êtes-vous sûr de vouloir soumettre cet article pour revue ?")) {
      setLoading(true);
      try {
        if (articleId) {
          await submitArticle(articleId);
          addToast("Article soumis pour revue !", "success");
          navigate('/dashboard');
        }
      } catch (error) {
        console.error(error);
        addToast("Erreur lors de la soumission", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
              
              <div className="hidden sm:flex items-center text-xs text-gray-400 border-l border-gray-200 pl-4">
                {saving ? (
                  <span className="flex items-center text-indigo-500">
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    Enregistrement...
                  </span>
                ) : lastSaved ? (
                  <span className="flex items-center text-green-600">
                    <Check className="h-3 w-3 mr-1.5" />
                    Enregistré à {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span>Brouillon non enregistré</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className="hidden sm:flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? 'Éditer' : 'Aperçu'}
              </button>
              
              <button
                onClick={handleManualSave}
                className="sm:hidden p-2 text-gray-600"
                title="Sauvegarder"
              >
                <Save className="h-5 w-5" />
              </button>

              <button
                onClick={handleSubmit(onSubmit)}
                disabled={loading || !watchedData.title}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Soumettre
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {status === 'REJECTED' && (
          <div className="mb-8 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-red-800">Article rejeté</h3>
              <p className="text-sm text-red-700 mt-1">Veuillez corriger les points suivants avant de soumettre à nouveau.</p>
            </div>
          </div>
        )}

        {previewMode ? (
          <article className="prose prose-lg prose-indigo mx-auto animate-in fade-in duration-300">
             {validImage && (
              <div className="mb-8 rounded-xl overflow-hidden shadow-lg h-64 w-full">
                <img src={imageUrl} alt="Cover" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="mb-6">
              <CategoryBadge category={watch('category')} />
            </div>
            <h1>{watch('title') || "Titre de l'article"}</h1>
            <p className="lead text-xl text-gray-500">{watch('excerpt') || "Le résumé apparaîtra ici..."}</p>
            <div className="mt-8 whitespace-pre-wrap font-serif text-gray-800">
              {watch('content') || "Le contenu de votre article..."}
            </div>
          </article>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in duration-500">
            {/* Image Cover Input */}
            <div className="group relative">
              {validImage ? (
                <div className="relative h-64 w-full rounded-xl overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                  <img src={imageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button 
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('imageUrl') as HTMLInputElement;
                        input.focus();
                        input.select();
                      }}
                      className="text-white font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm"
                    >
                      Changer l'image
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-24 w-full border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors bg-gray-50">
                  <ImageIcon className="h-6 w-6 mb-2" />
                  <span className="text-sm">Ajouter une image de couverture (URL)</span>
                </div>
              )}
              <input
                type="url"
                id="imageUrl"
                {...register('imageUrl')}
                className="mt-2 block w-full text-sm text-gray-500 bg-transparent border-b border-gray-200 focus:border-indigo-500 focus:ring-0 px-0 py-2 transition-colors placeholder-gray-300"
                placeholder="Collez l'URL de votre image ici..."
              />
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Catégorie
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <label 
                    key={cat}
                    className={`
                      cursor-pointer px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                      ${watch('category') === cat 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                    `}
                  >
                    <input
                      type="radio"
                      value={cat}
                      {...register('category')}
                      className="sr-only"
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <input
                type="text"
                {...register('title', { required: 'Le titre est requis' })}
                className="block w-full text-4xl font-extrabold text-gray-900 placeholder-gray-300 border-none focus:ring-0 px-0 bg-transparent"
                placeholder="Titre de votre article"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
            </div>

            {/* Excerpt */}
            <div>
              <textarea
                rows={2}
                {...register('excerpt', { required: 'Le résumé est requis' })}
                className="block w-full text-xl text-gray-500 placeholder-gray-300 border-none focus:ring-0 px-0 bg-transparent resize-none"
                placeholder="Écrivez un court résumé pour accrocher vos lecteurs..."
              />
              {errors.excerpt && <p className="mt-1 text-sm text-red-600">{errors.excerpt.message}</p>}
            </div>

            {/* Content */}
            <div className="pt-4 border-t border-gray-100">
              <textarea
                rows={15}
                {...register('content', { required: 'Le contenu est requis' })}
                className="block w-full text-lg text-gray-800 placeholder-gray-300 border-none focus:ring-0 px-0 bg-transparent font-serif leading-relaxed resize-y"
                placeholder="Racontez votre histoire..."
              />
              {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
