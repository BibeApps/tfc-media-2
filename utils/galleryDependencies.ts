import { supabase } from '../supabaseClient';

export interface DependencyCheckResult {
    canDelete: boolean;
    requiresWarning: boolean;
    dependencies: {
        events?: number;
        mediaItems?: number;
        subCategories?: number;
    };
    message: string;
}

/**
 * Check dependencies for an event (gallery item/session)
 * Events can always be deleted, but we warn about media items
 */
export async function checkEventDependencies(eventId: string): Promise<DependencyCheckResult> {
    try {
        // Count media items in this event
        const { count: mediaCount, error } = await supabase
            .from('gallery_items')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', eventId);

        if (error) throw error;

        const count = mediaCount || 0;

        return {
            canDelete: true, // Events can always be deleted
            requiresWarning: count > 0,
            dependencies: {
                mediaItems: count
            },
            message: count > 0
                ? `This event contains ${count} media item${count === 1 ? '' : 's'} that will be permanently deleted.`
                : 'This event is empty and can be deleted.'
        };
    } catch (error) {
        console.error('Error checking event dependencies:', error);
        return {
            canDelete: false,
            requiresWarning: true,
            dependencies: {},
            message: 'Error checking dependencies. Please try again.'
        };
    }
}

/**
 * Check dependencies for a sub category
 * Sub categories can only be deleted if they have no events
 */
export async function checkSubCategoryDependencies(subCategoryId: string): Promise<DependencyCheckResult> {
    try {
        // Count events in this sub category
        const { data: events, error: eventsError } = await supabase
            .from('sessions')
            .select('id')
            .eq('event_id', subCategoryId);

        if (eventsError) throw eventsError;

        const eventCount = events?.length || 0;

        // Count total media items across all events
        let mediaCount = 0;
        if (eventCount > 0) {
            const eventIds = events.map(e => e.id);
            const { count, error: mediaError } = await supabase
                .from('gallery_items')
                .select('*', { count: 'exact', head: true })
                .in('session_id', eventIds);

            if (mediaError) throw mediaError;
            mediaCount = count || 0;
        }

        return {
            canDelete: eventCount === 0,
            requiresWarning: true,
            dependencies: {
                events: eventCount,
                mediaItems: mediaCount
            },
            message: eventCount > 0
                ? `Cannot delete. This sub category contains ${eventCount} event${eventCount === 1 ? '' : 's'} and ${mediaCount} media item${mediaCount === 1 ? '' : 's'}.`
                : 'This sub category is empty and can be deleted.'
        };
    } catch (error) {
        console.error('Error checking sub category dependencies:', error);
        return {
            canDelete: false,
            requiresWarning: true,
            dependencies: {},
            message: 'Error checking dependencies. Please try again.'
        };
    }
}

/**
 * Check dependencies for a category
 * Categories can only be deleted if they have no sub categories
 */
export async function checkCategoryDependencies(categoryId: string): Promise<DependencyCheckResult> {
    try {
        // Count sub categories in this category
        const { data: subCategories, error: subCatError } = await supabase
            .from('events')
            .select('id')
            .eq('category_id', categoryId);

        if (subCatError) throw subCatError;

        const subCategoryCount = subCategories?.length || 0;

        // Count events and media across all sub categories
        let eventCount = 0;
        let mediaCount = 0;

        if (subCategoryCount > 0) {
            const subCategoryIds = subCategories.map(sc => sc.id);

            const { data: events, error: eventsError } = await supabase
                .from('sessions')
                .select('id')
                .in('event_id', subCategoryIds);

            if (eventsError) throw eventsError;
            eventCount = events?.length || 0;

            if (eventCount > 0) {
                const eventIds = events.map(e => e.id);
                const { count, error: mediaError } = await supabase
                    .from('gallery_items')
                    .select('*', { count: 'exact', head: true })
                    .in('session_id', eventIds);

                if (mediaError) throw mediaError;
                mediaCount = count || 0;
            }
        }

        return {
            canDelete: subCategoryCount === 0,
            requiresWarning: true,
            dependencies: {
                subCategories: subCategoryCount,
                events: eventCount,
                mediaItems: mediaCount
            },
            message: subCategoryCount > 0
                ? `Cannot delete. This category contains ${subCategoryCount} sub categor${subCategoryCount === 1 ? 'y' : 'ies'}, ${eventCount} event${eventCount === 1 ? '' : 's'}, and ${mediaCount} media item${mediaCount === 1 ? '' : 's'}.`
                : 'This category is empty and can be deleted.'
        };
    } catch (error) {
        console.error('Error checking category dependencies:', error);
        return {
            canDelete: false,
            requiresWarning: true,
            dependencies: {},
            message: 'Error checking dependencies. Please try again.'
        };
    }
}

/**
 * Delete an event and all its media items (cascade delete)
 */
export async function deleteEventWithMedia(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // First delete all media items
        const { error: mediaError } = await supabase
            .from('gallery_items')
            .delete()
            .eq('session_id', eventId);

        if (mediaError) throw mediaError;

        // Then delete the event
        const { error: eventError } = await supabase
            .from('sessions')
            .delete()
            .eq('id', eventId);

        if (eventError) throw eventError;

        return { success: true };
    } catch (error) {
        console.error('Error deleting event:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete event'
        };
    }
}

/**
 * Delete a sub category (only if empty)
 */
export async function deleteSubCategory(subCategoryId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if empty first
        const deps = await checkSubCategoryDependencies(subCategoryId);
        if (!deps.canDelete) {
            return {
                success: false,
                error: 'Sub category must be empty before deletion'
            };
        }

        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', subCategoryId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Error deleting sub category:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete sub category'
        };
    }
}

/**
 * Delete a category (only if empty)
 */
export async function deleteCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if empty first
        const deps = await checkCategoryDependencies(categoryId);
        if (!deps.canDelete) {
            return {
                success: false,
                error: 'Category must be empty before deletion'
            };
        }

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', categoryId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Error deleting category:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete category'
        };
    }
}

/**
 * Move an event to a different sub category
 */
export async function moveEvent(eventId: string, newSubCategoryId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('sessions')
            .update({ event_id: newSubCategoryId })
            .eq('id', eventId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Error moving event:', error);
        return {
            success: false,
            error: error.message || 'Failed to move event'
        };
    }
}

/**
 * Move a sub category to a different category
 */
export async function moveSubCategory(subCategoryId: string, newCategoryId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('events')
            .update({ category_id: newCategoryId })
            .eq('id', subCategoryId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Error moving sub category:', error);
        return {
            success: false,
            error: error.message || 'Failed to move sub category'
        };
    }
}
