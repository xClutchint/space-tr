import { upload } from '@vercel/blob/client';

export async function uploadFile(file, options = {}) {
  const safeName = String(file.name || 'asset').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '') || 'asset';
  const pathname = `space-cms/assets/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  return upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/admin/assets',
    clientPayload: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
    contentType: file.type,
    multipart: file.size > (options.multipartThreshold || 5 * 1024 * 1024),
    maximumSizeInBytes: options.maximumSizeInBytes,
    headers: options.csrf ? { 'X-CMS-CSRF': options.csrf } : undefined,
    abortSignal: options.signal,
    onUploadProgress: options.onProgress
  });
}
