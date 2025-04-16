/// <reference types="@sveltejs/kit" />
import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface Platform {
			env: {
				R2_BUCKET: R2Bucket;
				ASSETSBUCKET: R2Bucket;
				IMAGE_DIMS_KV: KVNamespace;
			};
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
		// interface PageData {}
	}
}

// Define R2Bucket interface for TypeScript
// Follows Cloudflare Workers R2 API: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
interface R2Bucket {
	get(key: string): Promise<R2Object | null>;
	head(key: string): Promise<R2ObjectHead | null>;
	put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob, options?: R2PutOptions): Promise<R2Object>;
	delete(key: string): Promise<void>;
	list(options?: R2ListOptions): Promise<R2Objects>;
}

interface R2Object extends R2ObjectHead {
	body: ReadableStream;
	bodyUsed: boolean;
	arrayBuffer(): Promise<ArrayBuffer>;
	text(): Promise<string>;
	json<T>(): Promise<T>;
	blob(): Promise<Blob>;
}

interface R2ObjectHead {
	key: string;
	version: string;
	size: number;
	etag: string;
	httpEtag: string;
	uploaded: Date;
	httpMetadata?: R2HTTPMetadata;
	customMetadata?: Record<string, string>;
	range?: R2Range;
	writeHttpMetadata(headers: Headers): void;
}

interface R2HTTPMetadata {
	contentType?: string;
	contentLanguage?: string;
	contentDisposition?: string;
	contentEncoding?: string;
	cacheControl?: string;
	cacheExpiry?: Date;
}

interface R2Range {
	offset: number;
	length?: number;
	suffix?: number;
}

interface R2PutOptions {
	httpMetadata?: R2HTTPMetadata;
	customMetadata?: Record<string, string>;
	md5?: ArrayBuffer | string;
}

interface R2ListOptions {
	limit?: number;
	prefix?: string;
	cursor?: string;
	delimiter?: string;
	include?: R2ListInclude[];
}

type R2ListInclude = 'httpMetadata' | 'customMetadata';

interface R2Objects {
	objects: R2Object[];
	truncated: boolean;
	cursor?: string;
	delimitedPrefixes: string[];
}

export {};
