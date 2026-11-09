export interface Work {
  id: string;
  title: string;
  description: string;
  published: string;
  coverImage: string;
  nsfw: boolean;
  tags: string[];
  film?: string; // Series film stock, for photos whose filenames don't say
  camera?: string; // Series camera, same
  nsfw_tags?: string[]; // Optional NSFW specific tags
  images: WorkImage[];
}

export interface WorkImage {
  src: string;
  alt: string;
} 