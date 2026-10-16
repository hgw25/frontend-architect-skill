export type Availability = 'published' | 'unavailable';
export type Post = {
  id: string;
  activityId: string | null;
  title: string;
  summary: string;
  creatorId: string;
  creatorName: string;
  status: Availability;
  owned: boolean;
  tags: string[];
  participants: string[];
  publishedAt: string;
  downloads: number;
};
export type Creator = { id: string; name: string; avatarUrl: string | null; summary: string };
export type Query = { title: string; status: Availability | 'all' };
export type Commands = {
  acquire: (id: string) => void;
  toggleFavorite: (postId: string) => void;
};
export type Page<T> = { items: T[]; cursor: string | null };
