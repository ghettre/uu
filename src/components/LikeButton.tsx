import React, { useState, useEffect } from 'react';
import { useBlog } from '../context/BlogContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Heart } from 'lucide-react';
import { cn } from '../lib/utils';

interface LikeButtonProps {
  articleId: string;
}

export function LikeButton({ articleId }: LikeButtonProps) {
  const { getLikeStatus, toggleLike } = useBlog();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [count, setCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    let mounted = true;
    getLikeStatus(articleId).then(status => {
      if (mounted) {
        setCount(status.count);
        setIsLiked(status.isLiked);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [articleId, user]);

  const handleToggle = async () => {
    if (!user) {
      addToast("Connectez-vous pour aimer cet article", "info");
      return;
    }

    // Optimistic UI update
    const previousLiked = isLiked;
    const previousCount = count;
    
    setIsLiked(!isLiked);
    setCount(prev => isLiked ? prev - 1 : prev + 1);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    try {
      const newStatus = await toggleLike(articleId);
      // Sync with server truth
      setCount(newStatus.count);
      setIsLiked(newStatus.isLiked);
    } catch (error) {
      // Revert on error
      setIsLiked(previousLiked);
      setCount(previousCount);
      addToast("Erreur lors de l'action", "error");
    }
  };

  if (loading) return <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />;

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "group flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 border",
        isLiked 
          ? "bg-red-50 border-red-200 text-red-600" 
          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
      )}
    >
      <Heart 
        className={cn(
          "w-5 h-5 transition-transform duration-300",
          isLiked ? "fill-current" : "",
          animating ? "scale-125" : "scale-100 group-hover:scale-110"
        )} 
      />
      <span className="font-medium text-sm">
        {count > 0 ? count : "J'aime"}
      </span>
    </button>
  );
}
