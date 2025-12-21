import { supabase } from '../supabaseClient';

/**
 * Get signed download URL for a purchased file
 */
export const getDownloadUrl = async (
    fileId: string,
    userId: string
): Promise<string> => {
    try {
        // Call Edge Function to verify ownership and generate signed URL
        const { data, error } = await supabase.functions.invoke('get-download-url', {
            body: {
                fileId,
                userId,
            },
        });

        if (error) throw error;

        return data.url;
    } catch (error) {
        console.error('Error getting download URL:', error);
        throw error;
    }
};

/**
 * Get all downloadable files for a project
 */
export const getProjectFiles = async (projectId: string) => {
    try {
        const { data, error } = await supabase
            .from('project_files')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching project files:', error);
        return [];
    }
};

/**
 * Get purchased gallery items for a user
 */
export const getPurchasedGalleryItems = async (userId: string) => {
    try {
        // Get all completed orders for this user
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('items')
            .eq('client_id', userId)
            .eq('status', 'completed');

        if (ordersError) throw ordersError;

        // Extract gallery item IDs from orders
        const itemIds = orders
            .flatMap(order => order.items || [])
            .map(item => item.id);

        if (itemIds.length === 0) return [];

        // Fetch the actual gallery items
        const { data: items, error: itemsError } = await supabase
            .from('gallery_items')
            .select('*')
            .in('id', itemIds);

        if (itemsError) throw itemsError;
        return items || [];
    } catch (error) {
        console.error('Error fetching purchased items:', error);
        return [];
    }
};

/**
 * Download a file (triggers browser download)
 */
export const downloadFile = async (
    fileId: string,
    userId: string,
    fileName: string
) => {
    try {
        const url = await getDownloadUrl(fileId, userId);

        // Create temporary link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return true;
    } catch (error) {
        console.error('Error downloading file:', error);
        throw error;
    }
};

/**
 * Check if user has access to a file
 */
export const checkFileAccess = async (
    fileId: string,
    userId: string
): Promise<boolean> => {
    try {
        const { data, error } = await supabase.functions.invoke('check-file-access', {
            body: {
                fileId,
                userId,
            },
        });

        if (error) return false;
        return data.hasAccess || false;
    } catch (error) {
        console.error('Error checking file access:', error);
        return false;
    }
};

/**
 * Upload file to Supabase Storage
 */
export const uploadFile = async (
    file: File,
    bucket: string,
    path: string
): Promise<string> => {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return urlData.publicUrl;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};
