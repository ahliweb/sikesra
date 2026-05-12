// SIKESRA R2 Storage Adapter
// Centralized R2 operations with tenant/site isolation, signed URLs, and security controls
// Source: docs/sikesra/04_api_contracts.md, docs/sikesra/06_security_rbac_abac.md

import type { SikesraRequestContext } from "../security/request-context";
import { maskR2Key } from "../security/masking";

// ---------- R2 Bucket Interface ----------

export interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | Blob | string, options?: R2PutOptions): Promise<R2Object>;
  head(key: string): Promise<R2Object | null>;
  get(key: string, options?: R2GetOptions): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}

export interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  sha256?: string;
  sha1?: string;
}

export interface R2GetOptions {
  onlyIf?: R2Conditional;
  range?: R2Range;
}

export interface R2ListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  include?: ("httpMetadata" | "customMetadata")[];
}

export interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

export interface R2Conditional {
  etagMatches?: string;
  etagDoesNotMatch?: string;
  uploadedBefore?: Date;
  uploadedAfter?: Date;
  secondsGranularity?: boolean;
}

export interface R2Range {
  offset?: number;
  length?: number;
  suffix?: number;
}

export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  checksums: R2Checksums;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  storageClass?: string;
  ssecKeyMd5?: string;
  writeHttpMetadata(headers: Headers): void;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  blob(): Promise<Blob>;
}

export interface R2Checksums {
  md5?: ArrayBuffer;
  sha1?: ArrayBuffer;
  sha256?: ArrayBuffer;
  sha384?: ArrayBuffer;
  sha512?: ArrayBuffer;
  crc32?: number;
  crc32c?: number;
  md5Hex(): string | undefined;
  sha1Hex(): string | undefined;
  sha256Hex(): string | undefined;
  sha384Hex(): string | undefined;
  sha512Hex(): string | undefined;
  crc32Hex(): string | undefined;
  crc32cHex(): string | undefined;
}

export interface R2Objects {
  objects: R2Object[];
  delimitedPrefixes: string[];
  truncated: boolean;
  cursor?: string;
}

// ---------- Storage Adapter Types ----------

export type DocumentCategory = "documents" | "imports" | "exports" | "temp";

export interface StorageKeyComponents {
  tenantId: string;
  siteId: string;
  category: DocumentCategory;
  year: string;
  month: string;
  uniqueId: string;
  safeFilename: string;
}

export interface GenerateKeyInput {
  filename: string;
  category?: DocumentCategory;
  uniqueId?: string;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds, default 3600 (1 hour)
  responseContentType?: string;
  responseContentDisposition?: string;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: string;
  method: "proxy" | "signed";
}

export interface StorageMetadata {
  key: string;
  size: number;
  contentType?: string;
  uploadedAt: string;
  checksumSha256?: string;
  customMetadata?: Record<string, string>;
}

export interface StorageObjectInfo {
  exists: boolean;
  size?: number;
  contentType?: string;
  uploadedAt?: string;
  checksumSha256?: string;
}

// ---------- Constants ----------

const MAX_KEY_LENGTH = 1024;
const ALLOWED_FILENAME_CHARS = /^[a-zA-Z0-9._-]+$/;
const DEFAULT_SIGNED_URL_EXPIRY = 3600; // 1 hour

// ---------- Helper Functions ----------

function sanitizeFilename(filename: string): string {
  const base = filename.trim();
  if (!base) return "unnamed";
  
  // Replace unsafe characters with hyphens
  const sanitized = base.replace(/[^a-zA-Z0-9._-\s]/g, "-").replace(/\s+/g, "-");
  
  // Limit length
  const maxBaseLength = 200;
  return sanitized.length > maxBaseLength 
    ? sanitized.substring(0, maxBaseLength) 
    : sanitized;
}

function generateUniqueId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getCurrentDateParts(): { year: string; month: string } {
  const now = new Date();
  return {
    year: String(now.getUTCFullYear()),
    month: String(now.getUTCMonth() + 1).padStart(2, "0"),
  };
}

// ---------- Core Storage Adapter ----------

export class SikesraStorageAdapter {
  private bucket: R2Bucket;
  private baseUrl: string;

  constructor(bucket: R2Bucket, baseUrl?: string) {
    this.bucket = bucket;
    this.baseUrl = baseUrl || "";
  }

  // Generate a secure R2 key with tenant/site isolation
  generateKey(ctx: SikesraRequestContext, input: GenerateKeyInput): string {
    const { year, month } = getCurrentDateParts();
    const uniqueId = input.uniqueId || generateUniqueId();
    const safeFilename = sanitizeFilename(input.filename);
    const category = input.category || "documents";

    const key = `tenants/${ctx.tenantId}/sites/${ctx.siteId}/${category}/${year}/${month}/${uniqueId}/${safeFilename}`;

    if (key.length > MAX_KEY_LENGTH) {
      throw new Error("Generated storage key exceeds maximum length");
    }

    return key;
  }

  // Parse key components (for internal use only, never expose to frontend)
  parseKey(key: string): StorageKeyComponents | null {
    const parts = key.split("/");
    if (parts.length < 7) return null;

    return {
      tenantId: parts[1],
      siteId: parts[3],
      category: parts[4] as DocumentCategory,
      year: parts[5],
      month: parts[6],
      uniqueId: parts[7],
      safeFilename: parts.slice(8).join("/"),
    };
  }

  // Validate that a key belongs to the current context
  validateKeyOwnership(key: string, ctx: SikesraRequestContext): boolean {
    const components = this.parseKey(key);
    if (!components) return false;
    return components.tenantId === ctx.tenantId && components.siteId === ctx.siteId;
  }

  // Upload data to R2
  async put(
    key: string,
    data: ReadableStream | ArrayBuffer | Blob | string,
    options?: { contentType?: string; customMetadata?: Record<string, string> },
  ): Promise<R2Object> {
    const putOptions: R2PutOptions = {};
    
    if (options?.contentType) {
      putOptions.httpMetadata = { contentType: options.contentType };
    }
    
    if (options?.customMetadata) {
      putOptions.customMetadata = options.customMetadata;
    }

    return this.bucket.put(key, data, putOptions);
  }

  // Get object metadata without downloading content
  async head(key: string): Promise<StorageObjectInfo> {
    const obj = await this.bucket.head(key);
    if (!obj) {
      return { exists: false };
    }

    return {
      exists: true,
      size: obj.size,
      contentType: obj.httpMetadata?.contentType,
      uploadedAt: obj.uploaded.toISOString(),
      checksumSha256: obj.checksums.sha256Hex(),
    };
  }

  // Get object content
  async get(key: string): Promise<R2ObjectBody | null> {
    return this.bucket.get(key);
  }

  // Delete object
  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  // List objects with prefix filtering
  async list(ctx: SikesraRequestContext, options: {
    category?: DocumentCategory;
    prefix?: string;
    limit?: number;
  } = {}): Promise<R2Objects> {
    let prefix = `tenants/${ctx.tenantId}/sites/${ctx.siteId}/`;
    
    if (options.category) {
      prefix += `${options.category}/`;
    }
    
    if (options.prefix) {
      prefix += options.prefix;
    }

    return this.bucket.list({
      prefix,
      limit: options.limit || 100,
    });
  }

  // Generate a proxy URL for document access (Workers-compatible)
  // Since Cloudflare Workers don't support presigned URLs natively,
  // we use a proxy endpoint that validates permissions before serving
  generateProxyUrl(ctx: SikesraRequestContext, key: string, options?: SignedUrlOptions): SignedUrlResult {
    if (!this.validateKeyOwnership(key, ctx)) {
      throw new Error("Key does not belong to current tenant/site");
    }

    const expiresIn = options?.expiresIn || DEFAULT_SIGNED_URL_EXPIRY;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    
    // Encode key to prevent URL injection
    const encodedKey = encodeURIComponent(key);
    const url = `${this.baseUrl}/_emdash/api/plugins/sikesra/v1/documents/proxy/${encodedKey}`;

    return {
      url,
      expiresAt,
      method: "proxy",
    };
  }

  // Generate a direct access URL (for public/internal documents only)
  // Never use this for restricted or highly_restricted documents
  generateDirectUrl(key: string): string {
    // For Cloudflare R2, direct URLs are not natively available
    // unless R2 is configured with public access or custom domain
    // This returns a placeholder that should be replaced with actual URL
    // when R2 public access is configured
    return `${this.baseUrl}/r2/${key}`;
  }

  // Get storage metadata for an object
  async getMetadata(key: string): Promise<StorageMetadata | null> {
    const obj = await this.bucket.head(key);
    if (!obj) return null;

    return {
      key,
      size: obj.size,
      contentType: obj.httpMetadata?.contentType,
      uploadedAt: obj.uploaded.toISOString(),
      checksumSha256: obj.checksums.sha256Hex(),
      customMetadata: obj.customMetadata,
    };
  }

  // Validate upload constraints
  validateUploadConstraints(input: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    maxBytes?: number;
    allowedMimeTypes?: string[];
  }): string[] {
    const errors: string[] = [];

    if (!input.filename || !input.filename.trim()) {
      errors.push("Filename is required");
    }

    const sanitized = sanitizeFilename(input.filename);
    if (sanitized === "unnamed") {
      errors.push("Filename contains only invalid characters");
    }

    const allowedTypes = input.allowedMimeTypes || [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(input.mimeType)) {
      errors.push(`MIME type ${input.mimeType} is not allowed`);
    }

    const maxBytes = input.maxBytes || 10 * 1024 * 1024; // 10MB default
    if (input.sizeBytes > maxBytes) {
      errors.push(`File size ${input.sizeBytes} bytes exceeds maximum ${maxBytes} bytes`);
    }

    return errors;
  }
}

// ---------- Factory Function ----------

export function createStorageAdapter(
  bucket: R2Bucket,
  options?: { baseUrl?: string },
): SikesraStorageAdapter {
  return new SikesraStorageAdapter(bucket, options?.baseUrl);
}

// ---------- Security Helpers ----------

// Sanitize storage metadata for API responses
// Never expose raw R2 keys in normal API responses
export function sanitizeStorageMetadata(metadata: StorageMetadata): Record<string, unknown> {
  return {
    size: metadata.size,
    contentType: metadata.contentType,
    uploadedAt: metadata.uploadedAt,
    checksumSha256: metadata.checksumSha256,
    // Note: key is intentionally excluded from normal responses
    // Use document ID instead for reference
  };
}

// Validate that a document classification is appropriate for the access method
export function validateAccessMethod(
  classification: string,
  method: "proxy" | "direct" | "signed",
): boolean {
  // Direct access is never allowed for restricted documents
  if (method === "direct") {
    return classification === "internal" || classification === "public_safe";
  }
  
  // Proxy and signed URLs are allowed for all classifications
  // (with proper permission checks at the endpoint level)
  return true;
}
