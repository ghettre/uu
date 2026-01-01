import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBlog } from '../context/BlogContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { CategoryBadge } from '../components/CategoryBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Check, X, Trash2, Layout, Clock, AlertCircle, CheckCircle, Search, Edit2, MessageSquare, Eye, Megaphone, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Article } from '../types';

type TabType = 'ALL' | 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED';

export function Dashboard() {
  const { user } = useAuth();
  const { 
    getAllArticlesForAdmin, 
    getArticlesByAuthor, 
    updateArticleStatus, 
    deleteArticle,
    announcements,
    createAnnouncement,
    deleteAnnouncement
  } = useBlog();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const navigate = useNavigate();
  
  // Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Announcement State
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';
  
  const articles = isAdmin 
    ? getAllArticlesForAdmin() 
    : getArticlesByAuthor(user.id);

  const filteredArticles = articles.filter(article => {
    if (activeTab === 'ALL') return true;
    return article.status === activeTab;
  });

  // Navigation Logic
  const handleArticleClick = (article: Article) => {
    if (isAdmin) {
      navigate(`/article/${article.id}`);
    } else {
      if (article.status === 'DRAFT' || article.status === 'REJECTED') {
        navigate(`/editor/${article.id}`);
      } else {
        navigate(`/article/${article.id}`);
      }
    }
  };

  const handleApprove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Voulez-vous vraiment publier cet article ?')) {
      try {
        await updateArticleStatus(id, 'PUBLISHED');
        addToast("Article publié avec succès !", "success");
      } catch (e) {
        addToast("Erreur lors de la publication", "error");
      }
    }
  };

  const openRejectModal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedArticleId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const submitReject = async () => {
    if (selectedArticleId && rejectReason.trim()) {
      try {
        await updateArticleStatus(selectedArticleId, 'REJECTED', rejectReason);
        addToast("Article rejeté avec feedback envoyé", "info");
        setRejectModalOpen(false);
      } catch (e) {
        addToast("Erreur lors du rejet", "error");
      }
    } else {
      addToast("Veuillez donner une raison", "warning");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      try {
        await deleteArticle(id);
        addToast("Article supprimé", "success");
      } catch (e) {
        addToast("Erreur lors de la suppression", "error");
      }
    }
  };

  const handleEditClick = (e: React.MouseEvent, article: Article) => {
    e.stopPropagation();
    navigate(`/editor/${article.id}`);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;
    try {
      await createAnnouncement(newAnnouncement);
      setNewAnnouncement('');
      setShowAnnouncementForm(false);
      addToast("Annonce publiée", "success");
    } catch (e) {
      addToast("Erreur lors de la publication de l'annonce", "error");
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (confirm("Supprimer cette annonce ?")) {
      try {
        await deleteAnnouncement(id);
        addToast("Annonce supprimée", "success");
      } catch (e) {
        addToast("Erreur", "error");
      }
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'ALL', label: 'Tous', icon: <Layout className="w-4 h-4" /> },
    { 
      id: 'DRAFT', 
      label: 'Brouillons', 
      icon: <Edit2 className="w-4 h-4" />,
      count: articles.filter(a => a.status === 'DRAFT').length 
    },
    { 
      id: 'PENDING', 
      label: 'En attente', 
      icon: <Clock className="w-4 h-4" />,
      count: articles.filter(a => a.status === 'PENDING').length 
    },
    { id: 'PUBLISHED', label: 'Publiés', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'REJECTED', label: 'Rejetés', icon: <AlertCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isAdmin ? 'Administration' : 'Mes Articles'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isAdmin 
                ? 'Gérez la modération, les annonces et le contenu.' 
                : 'Créez et suivez vos publications.'}
            </p>
          </div>
          {!isAdmin && (
            <Link
              to="/editor"
              className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-full hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 mr-2" />
              Écrire un article
            </Link>
          )}
        </div>

        {/* Announcements Section */}
        <div className="mb-8 space-y-4">
          {isAdmin && (
            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                  <Megaphone className="w-5 h-5" /> Gestion des annonces
                </h3>
                <button 
                  onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {showAnnouncementForm ? 'Fermer' : 'Nouvelle annonce'}
                </button>
              </div>
              
              {showAnnouncementForm && (
                <form onSubmit={handleCreateAnnouncement} className="mb-4 flex gap-2">
                  <input 
                    type="text" 
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    placeholder="Message de l'annonce..."
                    className="flex-1 rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                    Publier
                  </button>
                </form>
              )}

              <div className="space-y-2">
                {announcements.map(ann => (
                  <div key={ann.id} className="flex items-center justify-between bg-indigo-50 p-3 rounded-lg text-sm">
                    <span className="text-indigo-800">{ann.content}</span>
                    <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {announcements.length === 0 && !showAnnouncementForm && (
                  <p className="text-sm text-gray-400 italic">Aucune annonce active.</p>
                )}
              </div>
            </div>
          )}

          {/* Display Announcements for everyone (including admin preview) */}
          {!isAdmin && announcements.length > 0 && (
            <div className="space-y-3">
              {announcements.map(ann => (
                <div key={ann.id} className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-md flex items-start gap-3 animate-in slide-in-from-top-2">
                  <Bell className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{ann.content}</p>
                    <p className="text-xs text-indigo-100 mt-1">
                      {format(new Date(ann.createdAt), 'd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filters & Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-100 bg-white px-6 py-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                    ${activeTab === tab.id 
                      ? 'bg-gray-900 text-white shadow-md' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-gray-100">
            {filteredArticles.length > 0 ? (
              filteredArticles.map((article) => (
                <div 
                  key={article.id} 
                  onClick={() => handleArticleClick(article)}
                  className="p-6 hover:bg-gray-50/80 transition-colors group cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Image Thumbnail */}
                    <div className="hidden sm:block h-24 w-32 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden border border-gray-100 relative">
                      {article.imageUrl ? (
                        <img src={article.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-300">
                          <Layout className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <CategoryBadge category={article.category} size="sm" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 truncate pr-4 group-hover:text-indigo-600 transition-colors">
                            {article.title || "Sans titre"}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="font-medium text-gray-700">{article.authorName}</span>
                            <span>•</span>
                            <span>
                              {article.updatedAt 
                                ? `Mis à jour le ${format(new Date(article.updatedAt), 'd MMM yyyy', { locale: fr })}`
                                : `Créé le ${format(new Date(article.createdAt), 'd MMM yyyy', { locale: fr })}`
                              }
                            </span>
                            {/* Views Counter */}
                            <span className="flex items-center gap-1 text-gray-400 ml-2" title="Nombre de vues">
                              <Eye className="w-3.5 h-3.5" />
                              {article.views}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={article.status} />
                      </div>
                      
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {article.excerpt || "Pas de résumé..."}
                      </p>

                      {/* Feedback Display for Writers */}
                      {article.status === 'REJECTED' && article.feedback && !isAdmin && (
                        <div className="mt-3 bg-red-50 p-3 rounded-lg border border-red-100 text-sm animate-in slide-in-from-left-2">
                          <span className="font-bold text-red-800 flex items-center gap-2 mb-1">
                            <MessageSquare className="w-3 h-3" />
                            Note de l'administrateur :
                          </span>
                          <p className="text-red-700">{article.feedback}</p>
                        </div>
                      )}

                      {/* Actions Bar */}
                      <div className="mt-4 flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {isAdmin && article.status === 'PENDING' && (
                          <>
                            <button
                              onClick={(e) => handleApprove(e, article.id)}
                              className="inline-flex items-center px-3 py-1.5 border border-green-200 text-green-700 text-xs font-medium rounded-md bg-green-50 hover:bg-green-100 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5 mr-1.5" />
                              Publier
                            </button>
                            <button
                              onClick={(e) => openRejectModal(e, article.id)}
                              className="inline-flex items-center px-3 py-1.5 border border-red-200 text-red-700 text-xs font-medium rounded-md bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              <X className="w-3.5 h-3.5 mr-1.5" />
                              Rejeter
                            </button>
                          </>
                        )}
                        
                        {!isAdmin && (article.status === 'DRAFT' || article.status === 'REJECTED') && (
                           <button
                             onClick={(e) => handleEditClick(e, article)}
                             className="inline-flex items-center px-3 py-1.5 border border-indigo-200 text-indigo-700 text-xs font-medium rounded-md bg-indigo-50 hover:bg-indigo-100 transition-colors"
                           >
                             <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                             Modifier
                           </button>
                        )}

                        <button
                          onClick={(e) => handleDelete(e, article.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center">
                <div className="mx-auto h-24 w-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Aucun résultat</h3>
                <p className="text-gray-500 mt-1">Aucun article ne correspond à ce filtre.</p>
              </div>
            )}
          </div>
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
