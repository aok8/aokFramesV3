export interface BlogPost {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  published: string;
  label: string;
  image?: string;
}

export interface PageParams {
  slug: string;
} 