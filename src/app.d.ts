// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				ASSETS: R2Bucket;
			};
		}
	}
}

// Define R2Bucket interface for TypeScript
interface R2Bucket {
	get(key: string): Promise<R2Object | null>;
	put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream): Promise<R2Object>;
}

interface R2Object {
	key: string;
	version: string;
	size: number;
	etag: string;
	httpEtag: string;
	body: ReadableStream;
	writeHttpMetadata: (headers: Headers) => void;
	text: () => Promise<string>;
	json: () => Promise<any>;
	arrayBuffer: () => Promise<ArrayBuffer>;
}

export {};
