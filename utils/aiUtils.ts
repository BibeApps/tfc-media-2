import { supabase } from '../supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

/**
 * Generate thumbnail image using AI
 */
export const generateThumbnailWithAI = async (
    name: string,
    type: 'category' | 'subcategory' | 'event'
): Promise<Blob> => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Generate a professional, high-quality thumbnail image for a ${type} named "${name}". 
    The image should be visually appealing, modern, and suitable for a media/photography business gallery.
    Style: Clean, professional, vibrant colors, suitable for a premium media company.`;

        // Note: Gemini doesn't directly generate images yet, so we'll use a placeholder approach
        // In production, you'd integrate with an image generation API like DALL-E or Midjourney

        // For now, create a gradient placeholder with text
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');

        if (!ctx) throw new Error('Could not get canvas context');

        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 800, 600);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 600);

        // Add text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, 400, 300);

        // Convert to blob
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
            }, 'image/jpeg', 0.9);
        });
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        throw error;
    }
};

/**
 * Generate AI description for media file
 */
export const generateMediaDescription = async (file: File): Promise<string> => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // For images, use vision model
        if (file.type.startsWith('image/')) {
            const imageData = await fileToBase64(file);

            const result = await model.generateContent([
                'Analyze this image and provide a concise, professional description (2-3 sentences) suitable for a photography gallery. Focus on the subject, composition, mood, and any notable elements.',
                {
                    inlineData: {
                        mimeType: file.type,
                        data: imageData.split(',')[1], // Remove data:image/jpeg;base64, prefix
                    },
                },
            ]);

            return result.response.text();
        } else {
            // For videos, generate based on filename
            const result = await model.generateContent(
                `Generate a professional description (2-3 sentences) for a video file named "${file.name}". 
        Make it suitable for a photography/videography gallery.`
            );

            return result.response.text();
        }
    } catch (error) {
        console.error('Error generating description:', error);
        return 'Professional media capture showcasing exceptional quality and composition.';
    }
};

/**
 * Convert file to base64
 */
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Upload thumbnail to Supabase Storage
 */
export const uploadThumbnail = async (
    file: File | Blob,
    folder: 'categories' | 'events' | 'sessions',
    id: string
): Promise<string> => {
    try {
        const fileName = `${id}.jpg`;
        const filePath = `${folder}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('thumbnails')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true,
            });

        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(data.path);

        return urlData.publicUrl;
    } catch (error) {
        console.error('Error uploading thumbnail:', error);
        throw error;
    }
}

/**
 * Generate sequential filename based on event name
 */
export const generateSequentialFileName = async (
    eventId: string,
    fileExtension: string
): Promise<string> => {
    try {
        // Get event/session name
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('name')
            .eq('id', eventId)
            .single();

        if (sessionError) throw sessionError;

        // Count existing files for this event
        const { count, error: countError } = await supabase
            .from('gallery_items')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', eventId);

        if (countError) throw countError;

        // Format name: "Event_Name_1.jpg"
        const eventName = session.name
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_]/g, '');
        const sequenceNumber = (count || 0) + 1;

        return `${eventName}_${sequenceNumber}.${fileExtension}`;
    } catch (error) {
        console.error('Error generating sequential filename:', error);
        // Fallback to timestamp-based naming
        return `${Date.now()}.${fileExtension}`;
    }
};

/**
 * Upload media file (original)
 */
export const uploadOriginalMedia = async (
    file: File,
    eventId: string
): Promise<{ url: string; fileName: string }> => {
    try {
        // Get file extension
        const fileExtension = file.name.split('.').pop() || 'jpg';

        // Generate sequential filename
        const fileName = await generateSequentialFileName(eventId, fileExtension);
        const filePath = `session-media/${eventId}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('media')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from('media')
            .getPublicUrl(data.path);

        return {
            url: urlData.publicUrl,
            fileName: fileName
        };
    } catch (error) {
        console.error('Error uploading original media:', error);
        throw error;
    }
};

/**
 * Generate thumbnail from video file
 */
export const generateVideoThumbnail = async (videoFile: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = () => {
            // Seek to 2 seconds or 10% of duration, whichever is smaller
            video.currentTime = Math.min(2, video.duration * 0.1);
        };

        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(
                    (blob) => {
                        URL.revokeObjectURL(video.src);
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to generate thumbnail blob'));
                        }
                    },
                    'image/jpeg',
                    0.8
                );
            } catch (error) {
                URL.revokeObjectURL(video.src);
                reject(error);
            }
        };

        video.onerror = () => {
            URL.revokeObjectURL(video.src);
            reject(new Error('Failed to load video'));
        };

        video.src = URL.createObjectURL(videoFile);
    });
};

/**
 * Generate and upload watermarked version
 * For videos, generates and uploads a thumbnail instead of the full video
 */
export const generateWatermarkedMedia = async (
    file: File,
    eventId: string,
    fileName: string // Accept the filename from uploadOriginalMedia
): Promise<string> => {
    try {
        // For images, add watermark using canvas
        if (file.type.startsWith('image/')) {
            const watermarkedBlob = await addWatermarkToImage(file);
            const filePath = `session-media/${eventId}/${fileName}`;

            const { data, error } = await supabase.storage
                .from('watermarked')
                .upload(filePath, watermarkedBlob, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('watermarked')
                .getPublicUrl(data.path);

            return urlData.publicUrl;
        } else {
            // For videos, generate and upload thumbnail
            const thumbnailBlob = await generateVideoThumbnail(file);
            // For video thumbnails, replace the video extension with .jpg
            const thumbnailFileName = fileName.replace(/\.[^.]+$/, '.jpg');
            const filePath = `session-media/${eventId}/${thumbnailFileName}`;

            const { data, error } = await supabase.storage
                .from('watermarked')
                .upload(filePath, thumbnailBlob, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('watermarked')
                .getPublicUrl(data.path);

            return urlData.publicUrl;
        }
    } catch (error) {
        console.error('Error generating watermarked media:', error);
        throw error;
    }
};

/**
 * Add watermark to image
 */
const addWatermarkToImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Configure watermark text
            const fontSize = Math.max(40, Math.min(img.width, img.height) / 15);
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Calculate spacing for tiled watermarks
            const watermarkText = 'TFC MEDIA';
            const textMetrics = ctx.measureText(watermarkText);
            const textWidth = textMetrics.width;
            const textHeight = fontSize;

            // Spacing between watermarks (diagonal)
            const spacingX = textWidth * 1.5;
            const spacingY = textHeight * 3;

            // Tile watermarks across entire image
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(-Math.PI / 6); // 30 degree angle

            // Calculate how many watermarks we need to cover the image
            const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
            const cols = Math.ceil(diagonal / spacingX) + 2;
            const rows = Math.ceil(diagonal / spacingY) + 2;

            // Draw tiled watermarks
            for (let row = -rows; row < rows; row++) {
                for (let col = -cols; col < cols; col++) {
                    const x = col * spacingX;
                    const y = row * spacingY;
                    ctx.fillText(watermarkText, x, y);
                }
            }

            ctx.restore();

            // Convert to blob
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob'));
                }
            }, file.type, 0.85); // Slightly reduced quality
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
};

/**
 * Detect if file is image or video
 */
export const detectMediaType = (file: File): 'photo' | 'video' => {
    if (file.type.startsWith('image/')) return 'photo';
    if (file.type.startsWith('video/')) return 'video';
    return 'photo'; // Default
};

/**
 * Get image dimensions
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            resolve({ width: 0, height: 0 });
            return;
        }

        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
};
