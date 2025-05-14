export interface Work {
  id: string;
  title: string;
  description: string;
  published: string;
  coverImage: string;
  nsfw: boolean;
  tags: string[];
  nsfw_tags?: string[]; // Optional NSFW specific tags
  images: WorkImage[];
}

export interface WorkImage {
  src: string;
  alt: string;
} 