// Photos API routes for A Kid and a Shovel

import { Hono } from 'hono';
import type { Env } from '../../types';
import { generateId } from '../../utils/helpers';
import { authMiddleware, requireAuth, getCurrentUser } from '../../middleware/auth';

const photos = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
photos.use('*', authMiddleware());

// Get upload URL for direct R2 upload
photos.post('/upload-url', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const { type, content_type, job_id } = await c.req.json();

    // Validate type
    const validTypes = ['profile', 'before', 'after', 'additional'];
    if (!validTypes.includes(type)) {
      return c.json({ success: false, error: 'Invalid photo type' }, 400);
    }

    // Validate content type
    const validContentTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validContentTypes.includes(content_type)) {
      return c.json({ success: false, error: 'Invalid content type. Use JPEG, PNG, or WebP' }, 400);
    }

    // Generate unique key
    const extension = content_type.split('/')[1];
    const photoId = generateId();
    const key = `${type}/${user!.id}/${job_id || 'profile'}/${photoId}.${extension}`;

    // For Cloudflare R2, we'll use direct upload
    // In production, you'd create a signed URL using R2's multipart upload API
    // For now, we'll return the key and handle upload directly

    return c.json({
      success: true,
      data: {
        key,
        upload_url: `/api/photos/upload/${encodeURIComponent(key)}`,
        public_url: `/photos/${key}`,
      },
    });
  } catch (error) {
    console.error('Get upload URL error:', error);
    return c.json({ success: false, error: 'Failed to get upload URL' }, 500);
  }
});

// Direct upload to R2
photos.put('/upload/:key{.+}', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const key = c.req.param('key');

    // Verify the key belongs to this user
    const keyParts = key.split('/');
    if (keyParts.length < 3 || keyParts[1] !== user!.id) {
      return c.json({ success: false, error: 'Invalid upload key' }, 403);
    }

    // Get the image data
    const contentType = c.req.header('Content-Type') || 'image/jpeg';
    const body = await c.req.arrayBuffer();

    // Validate size (max 10MB)
    if (body.byteLength > 10 * 1024 * 1024) {
      return c.json({ success: false, error: 'Image too large. Maximum size is 10MB' }, 400);
    }

    // Optional: Run through Workers AI for moderation
    // This is a placeholder - you'd implement actual moderation logic
    // const moderation = await moderateImage(c.env.AI, body);
    // if (!moderation.safe) {
    //   return c.json({ success: false, error: 'Image rejected by moderation' }, 400);
    // }

    // Upload to R2
    await c.env.PHOTOS.put(key, body, {
      httpMetadata: {
        contentType,
      },
      customMetadata: {
        uploadedBy: user!.id,
        uploadedAt: new Date().toISOString(),
      },
    });

    return c.json({
      success: true,
      data: {
        key,
        url: `/photos/${key}`,
      },
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    return c.json({ success: false, error: 'Failed to upload photo' }, 500);
  }
});

// Serve photo from R2
photos.get('/serve/:key{.+}', async (c) => {
  try {
    const key = c.req.param('key');

    const object = await c.env.PHOTOS.get(key);
    if (!object) {
      return c.json({ success: false, error: 'Photo not found' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year

    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    console.error('Serve photo error:', error);
    return c.json({ success: false, error: 'Failed to serve photo' }, 500);
  }
});

// Delete photo
photos.delete('/:key{.+}', requireAuth(), async (c) => {
  try {
    const user = getCurrentUser(c);
    const key = c.req.param('key');

    // Verify the key belongs to this user
    const keyParts = key.split('/');
    if (keyParts.length < 3 || keyParts[1] !== user!.id) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    await c.env.PHOTOS.delete(key);

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete photo error:', error);
    return c.json({ success: false, error: 'Failed to delete photo' }, 500);
  }
});

export default photos;

// Helper function for AI moderation (placeholder)
async function moderateImage(ai: Ai, imageData: ArrayBuffer): Promise<{ safe: boolean; reason?: string }> {
  // This would use Cloudflare Workers AI for image moderation
  // For now, return safe by default
  try {
    // Example using Cloudflare AI (when implemented):
    // const result = await ai.run('@cf/microsoft/resnet-50', {
    //   image: [...new Uint8Array(imageData)],
    // });
    // Check for inappropriate content in result

    return { safe: true };
  } catch (error) {
    console.error('Image moderation error:', error);
    return { safe: true }; // Fail open for now
  }
}
