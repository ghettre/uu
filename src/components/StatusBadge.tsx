import React from 'react';
import { ArticleStatus } from '../types';
import { cn } from '../lib/utils';
import { CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

interface StatusBadgeProps {
  status: ArticleStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = {
    PUBLISHED: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle,
      label: 'Publié'
    },
    PENDING: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: Clock,
      label: 'En attente'
    },
    REJECTED: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: XCircle,
      label: 'Rejeté'
    },
    DRAFT: {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: FileText,
      label: 'Brouillon'
    }
  };

  const { color, icon: Icon, label } = config[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", color, className)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
