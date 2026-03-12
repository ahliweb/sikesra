export interface UploadSessionRequest {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  accessControl?: 'public' | 'private' | 'tenant_only';
  sessionBoundAccess?: boolean;
  categoryId?: string | null;
  folder?: string;
}

export interface UploadSessionResponse {
  sessionId: string;
  uploadUrl: string;
  finalizeUrl: string;
  expiresAt: string;
  storageKey: string;
}

export interface CompleteSessionRequest {
  sessionId: string;
}

export interface MediaObjectResponse {
  id: string;
  fileName: string;
  url: string; // The presigned GET url or public URL
}

export const MEDIA_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  SERVER_ERROR: 'SERVER_ERROR'
} as const;

export function slugifyMediaValue(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function inferMediaKind(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf')
    || mimeType.includes('document')
    || mimeType.includes('text')
    || mimeType.includes('sheet')
    || mimeType.includes('presentation')
  ) {
    return 'document';
  }

  return 'other';
}

export function generateStorageKey(tenantId: string, fileName: string, sessionBoundAccess = false): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  if (sessionBoundAccess) {
    const encryptedPrefix = crypto.randomUUID().replace(/-/g, '');
    return `tenants/${tenantId}/protected/${encryptedPrefix}_${timestamp}_${safeName}`;
  }

  return `tenants/${tenantId}/${timestamp}_${safeName}`;
}
