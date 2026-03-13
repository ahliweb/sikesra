export const MEDIA_ERROR_CODES = {
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    BAD_REQUEST: 'BAD_REQUEST',
    SERVER_ERROR: 'SERVER_ERROR'
};
export function slugifyMediaValue(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}
export function inferMediaKind(mimeType) {
    if (!mimeType)
        return 'other';
    if (mimeType.startsWith('image/'))
        return 'image';
    if (mimeType.startsWith('video/'))
        return 'video';
    if (mimeType.startsWith('audio/'))
        return 'audio';
    if (mimeType.includes('pdf')
        || mimeType.includes('document')
        || mimeType.includes('text')
        || mimeType.includes('sheet')
        || mimeType.includes('presentation')) {
        return 'document';
    }
    return 'other';
}
export function generateStorageKey(tenantId, fileName, sessionBoundAccess = false) {
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    if (sessionBoundAccess) {
        const encryptedPrefix = crypto.randomUUID().replace(/-/g, '');
        return `tenants/${tenantId}/protected/${encryptedPrefix}_${timestamp}_${safeName}`;
    }
    return `tenants/${tenantId}/${timestamp}_${safeName}`;
}
