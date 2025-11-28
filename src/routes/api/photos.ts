import { Hono } from 'hono';
import type { Env } from '../../types';

export const photosRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /api/photos/upload
 * Upload a photo to R2
 */
photosRoutes.post('/upload', async (c) => {
  // TODO: Implement photo upload
  // - Validate file type (jpg, png)
  // - Validate file size (max 10MB)
  // - Run through AI moderation
  // - Upload to R2
  // - Return public URL
  return c.json({ success: false, error: 'Not implemented' }, 501);
});

/**
 * GET /api/photos/:key
 * Get a photo from R2
 */
photosRoutes.get('/:key', async (c) => {
  const key = c.req.param('key');

  try {
    const object = await c.env.PHOTOS.get(key);
    if (!object) {
      return c.json({ success: false, error: 'Photo not found' }, 404);
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
        ETag: object.etag,
      },
    });
  } catch (error) {
    console.error('Error fetching photo:', error);
    return c.json({ success: false, error: 'Failed to fetch photo' }, 500);
  }
});

/**
 * DELETE /api/photos/:key
 * Delete a photo from R2 (admin only)
 */
photosRoutes.delete('/:key', async (c) => {
  // TODO: Implement photo deletion with authorization
  return c.json({ success: false, error: 'Not implemented' }, 501);
});
