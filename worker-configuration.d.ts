declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    SIKESRA_DB: D1Database;
    MEDIA: R2Bucket;
    SIKESRA_DOCUMENTS: R2Bucket;
    SESSION: KVNamespace;
    LOADER: WorkerLoader;
  }
}

interface Env extends Cloudflare.Env {}
