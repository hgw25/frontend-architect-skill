export type Post = {
  id: string;
  activityId: string | null;
  title: string;
  creatorId: string;
  creatorName: string;
  status: 'published' | 'unavailable';
  owned: boolean;
};

export type Commands = { acquire: (id: string) => void };
