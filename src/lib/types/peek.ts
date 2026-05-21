export type PeekImage = {
  key: string;       // "temps/shot-001.webp"
  url: string;       // full CDN URL
  uploaded: string;  // ISO date string
};

export type PeekPageData = {
  images: PeekImage[];
  isEmpty: boolean;
};
