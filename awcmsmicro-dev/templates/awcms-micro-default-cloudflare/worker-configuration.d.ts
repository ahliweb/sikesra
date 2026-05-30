/* eslint-disable */
declare namespace Cloudflare {
	interface Env {
		DB: D1Database;
		MEDIA: R2Bucket;
		LOADER: Fetcher;
		SESSION: KVNamespace;
		IMAGES: ImagesBinding;
		AWCMS_MICRO_SITE_URL?: string;
		AWCMS_MICRO_STORAGE_PUBLIC_BASE_URL?: string;
	}
}

interface Env extends Cloudflare.Env {}
