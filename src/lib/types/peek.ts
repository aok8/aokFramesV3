export type PeekImage = {
  key: string;       // "temps/shot-001.webp"
  url: string;       // full CDN URL
  uploaded: string;  // ISO date string
	alt?: string; // optional editorial description from future ingestion tooling
};

export type PeekPageData = {
  images: PeekImage[];
  isEmpty: boolean;
	loadError?: boolean;
};
