export type Role = 'ADMIN' | 'WRITER';
export type ArticleStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED';

export const CATEGORIES = [
  'Technologie',
  'Développement',
  'Business',
  'Lifestyle',
  'Santé',
  'Éducation',
  'Voyage',
  'Cuisine',
  'Autre'
] as const;

export type Category = typeof CATEGORIES[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  authorId: string;
  authorName: string;
  status: ArticleStatus;
  category: Category;
  createdAt: string;
  updatedAt?: string;
  imageUrl?: string;
  feedback?: string | null;
  views: number;
}

export interface Comment {
  id: string;
  content: string;
  articleId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
}

export interface LikeStatus {
  count: number;
  isLiked: boolean;
}

export interface Announcement {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}
