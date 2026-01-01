import React from 'react';
import { Category } from '../types';
import { cn } from '../lib/utils';
import { 
  Cpu, 
  Code, 
  Briefcase, 
  Coffee, 
  Activity, 
  GraduationCap, 
  Plane, 
  Utensils, 
  Tag 
} from 'lucide-react';

interface CategoryBadgeProps {
  category: Category;
  className?: string;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, className, size = 'sm' }: CategoryBadgeProps) {
  const config: Record<Category, { color: string; icon: any }> = {
    'Technologie': { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Cpu },
    'Développement': { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Code },
    'Business': { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Briefcase },
    'Lifestyle': { color: 'bg-pink-100 text-pink-700 border-pink-200', icon: Coffee },
    'Santé': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Activity },
    'Éducation': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: GraduationCap },
    'Voyage': { color: 'bg-sky-100 text-sky-700 border-sky-200', icon: Plane },
    'Cuisine': { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Utensils },
    'Autre': { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Tag },
  };

  const { color, icon: Icon } = config[category] || config['Autre'];

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-medium border transition-colors",
      size === 'sm' ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
      color,
      className
    )}>
      <Icon className={cn(size === 'sm' ? "w-3 h-3" : "w-4 h-4")} />
      {category}
    </span>
  );
}
