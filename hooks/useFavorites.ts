import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export interface Favorite {
    id: string;
    client_id: string;
    gallery_item_id: string;
    created_at: string;
}

export const useFavorites = () => {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch user's favorites on mount
    useEffect(() => {
        if (user?.id) {
            fetchFavorites();
        } else {
            setLoading(false);
        }
    }, [user?.id]);

    // Fetch all favorites for the current user
    const fetchFavorites = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('favorites')
                .select('gallery_item_id')
                .eq('client_id', user!.id);

            if (fetchError) throw fetchError;

            // Extract just the gallery_item_ids into an array
            const favoriteIds = data?.map(f => f.gallery_item_id) || [];
            setFavorites(favoriteIds);
        } catch (err) {
            console.error('Error fetching favorites:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch favorites');
        } finally {
            setLoading(false);
        }
    };

    // Check if an item is favorited
    const isFavorited = (itemId: string): boolean => {
        return favorites.includes(itemId);
    };

    // Toggle favorite status for an item
    const toggleFavorite = async (itemId: string): Promise<boolean> => {
        if (!user?.id) {
            console.error('User not authenticated');
            return false;
        }

        try {
            const isCurrentlyFavorited = favorites.includes(itemId);

            if (isCurrentlyFavorited) {
                // Remove from favorites
                const { error: deleteError } = await supabase
                    .from('favorites')
                    .delete()
                    .eq('client_id', user.id)
                    .eq('gallery_item_id', itemId);

                if (deleteError) throw deleteError;

                // Optimistically update local state
                setFavorites(prev => prev.filter(id => id !== itemId));
                return false; // Item is no longer favorited
            } else {
                // Add to favorites
                const { error: insertError } = await supabase
                    .from('favorites')
                    .insert({
                        client_id: user.id,
                        gallery_item_id: itemId
                    });

                if (insertError) throw insertError;

                // Optimistically update local state
                setFavorites(prev => [...prev, itemId]);
                return true; // Item is now favorited
            }
        } catch (err) {
            console.error('Error toggling favorite:', err);
            setError(err instanceof Error ? err.message : 'Failed to toggle favorite');

            // Revert optimistic update on error
            await fetchFavorites();
            return isFavorited(itemId);
        }
    };

    // Add a favorite (explicit add)
    const addFavorite = async (itemId: string): Promise<boolean> => {
        if (!user?.id) return false;
        if (favorites.includes(itemId)) return true; // Already favorited

        try {
            const { error: insertError } = await supabase
                .from('favorites')
                .insert({
                    client_id: user.id,
                    gallery_item_id: itemId
                });

            if (insertError) throw insertError;

            setFavorites(prev => [...prev, itemId]);
            return true;
        } catch (err) {
            console.error('Error adding favorite:', err);
            return false;
        }
    };

    // Remove a favorite (explicit remove)
    const removeFavorite = async (itemId: string): Promise<boolean> => {
        if (!user?.id) return false;
        if (!favorites.includes(itemId)) return true; // Already not favorited

        try {
            const { error: deleteError } = await supabase
                .from('favorites')
                .delete()
                .eq('client_id', user.id)
                .eq('gallery_item_id', itemId);

            if (deleteError) throw deleteError;

            setFavorites(prev => prev.filter(id => id !== itemId));
            return true;
        } catch (err) {
            console.error('Error removing favorite:', err);
            return false;
        }
    };

    return {
        favorites,
        loading,
        error,
        isFavorited,
        toggleFavorite,
        addFavorite,
        removeFavorite,
        refetch: fetchFavorites
    };
};
