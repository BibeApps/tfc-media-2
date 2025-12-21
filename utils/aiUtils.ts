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
};

/**
 * Upload media file (original)
 */
export const uploadOriginalMedia = async (
    file: File,
    eventId: string
): Promise<string> => {
    try {
        const fileName = `${Date.now()}-${file.name}`;
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

        return urlData.publicUrl;
    } catch (error) {
        console.error('Error uploading original media:', error);
        throw error;
    }
};

/**
 * Generate and upload watermarked version
 */
export const generateWatermarkedMedia = async (
    file: File,
    eventId: string
): Promise<string> => {
    try {
        // For images, add watermark using canvas
        if (file.type.startsWith('image/')) {
            const watermarkedBlob = await addWatermarkToImage(file);

            const fileName = `${Date.now()}-${file.name}`;
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
            // For videos, upload as-is (watermarking videos requires server-side processing)
            const fileName = `${Date.now()}-${file.name}`;
            const filePath = `session-media/${eventId}/${fileName}`;

            const { data, error } = await supabase.storage
                .from('watermarked')
                .upload(filePath, file, {
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

            // Add watermark
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Diagonal watermark
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText('TFC MEDIA', 0, 0);
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
