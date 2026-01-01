import React, { useState } from 'react';
import { useBlog } from '../context/BlogContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BookOpen, ArrowRight, Sparkles, Filter } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES, Category } from '../types';
import { CategoryBadge } from '../components/CategoryBadge';

export function Home() {
  const { getPublishedArticles } = useBlog();
  const articles = getPublishedArticles();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');

  const filteredArticles = selectedCategory === 'All' 
    ? articles 
    : articles.filter(a => a.category === selectedCategory);

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Modern Hero Section */}
      <div className="relative overflow-hidden bg-gray-900 text-white">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1519681393798-3828fb4090bb?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
            alt="Background"
            className="h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-sm font-medium text-indigo-300 mb-6 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Plateforme de blogging collaborative
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              L'endroit où les bonnes idées <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">prennent vie.</span>
            </h1>
            <p className="text-xl text-gray-300 mb-10 leading-relaxed max-w-2xl">
              Rejoignez une communauté de créateurs passionnés. Partagez vos connaissances, découvrez de nouvelles perspectives et inspirez le monde.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/signup"
                className="inline-flex justify-center items-center px-8 py-4 border border-transparent text-base font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 md:text-lg transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50"
              >
                Commencer à écrire
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex justify-center items-center px-8 py-4 border border-gray-600 text-base font-medium rounded-full text-gray-200 hover:bg-gray-800 md:text-lg transition-all backdrop-blur-sm"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-4 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`
                whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all
                ${selectedCategory === 'All' 
                  ? 'bg-gray-900 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              Tout voir
            </button>
            <div className="w-px h-6 bg-gray-200 mx-2 flex-shrink-0" />
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all
                  ${selectedCategory === category 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-600'}
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {selectedCategory === 'All' ? 'À la une' : selectedCategory}
            </h2>
            <p className="mt-2 text-gray-500">
              {filteredArticles.length} article{filteredArticles.length > 1 ? 's' : ''} trouvé{filteredArticles.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article) => (
            <article 
              key={article.id} 
              onClick={() => navigate(`/article/${article.id}`)}
              className="flex flex-col group cursor-pointer"
            >
              <div className="relative overflow-hidden rounded-2xl aspect-[16/9] mb-6 bg-gray-100 shadow-sm">
                {article.imageUrl ? (
                  <img 
                    className="h-full w-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                    src={article.imageUrl} 
                    alt={article.title} 
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                    <BookOpen className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <CategoryBadge category={article.category} className="shadow-sm" />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
              </div>
              
              <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                  <time dateTime={article.createdAt}>
                    {format(new Date(article.createdAt), 'd MMM yyyy', { locale: fr })}
                  </time>
                  <span>•</span>
                  <span>{article.authorName}</span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors leading-tight">
                  {article.title}
                </h3>
                
                <p className="text-gray-600 line-clamp-3 mb-4 leading-relaxed flex-1">
                  {article.excerpt}
                </p>
                
                <div className="flex items-center mt-auto pt-4 border-t border-gray-100 text-indigo-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                  Lire l'article <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </article>
          ))}
        </div>
        
        {filteredArticles.length === 0 && (
          <div className="text-center py-24 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-4">
              <Filter className="h-8 w-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Aucun article dans cette catégorie</h3>
            <p className="mt-2 text-gray-500 max-w-sm mx-auto">Essayez de sélectionner une autre catégorie ou revenez plus tard.</p>
            {selectedCategory !== 'All' && (
              <button 
                onClick={() => setSelectedCategory('All')}
                className="mt-6 text-indigo-600 font-medium hover:text-indigo-700"
              >
                Voir tous les articles
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
