import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { EventType, Event, Session, GalleryItem } from '../types';
import { supabase, isConfigured } from '../supabaseClient';
import { GALLERY_DATA } from '../constants';

interface GalleryContextType {
  galleryData: EventType[];
  refreshGallery: () => void;
  addEventType: (type: EventType) => Promise<void>;
  addEvent: (typeId: string, event: Event) => Promise<void>;
  addSession: (typeId: string, eventId: string, session: Session) => Promise<void>;
  addItemsToSession: (typeId: string, eventId: string, sessionId: string, items: GalleryItem[]) => Promise<void>;
  getEventType: (id: string) => EventType | undefined;
  getEvent: (typeId: string, eventId: string) => Event | undefined;
  getSession: (typeId: string, eventId: string, sessionId: string) => Session | undefined;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export const GalleryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [galleryData, setGalleryData] = useState<EventType[]>([]);

  const fetchGallery = async () => {
    if (!isConfigured) {
        console.warn("Supabase not configured. Using Mock Gallery Data.");
        setGalleryData(GALLERY_DATA);
        return;
    }

    try {
      // Optimized: Fetch entire hierarchy in one query using Supabase joins
      // Note: This relies on Foreign Keys being set up correctly in the database schema
      const { data: categories, error } = await supabase
        .from('event_categories')
        .select(`
            *,
            events (
                *,
                sessions (
                    *,
                    items: gallery_items (*)
                )
            )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (!categories) return;

      const structuredData: EventType[] = categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        thumbnail: cat.thumbnail,
        events: (cat.events || []).map((ev: any) => ({
            id: ev.id,
            name: ev.name,
            slug: ev.slug,
            date: ev.date,
            thumbnail: ev.thumbnail,
            sessions: (ev.sessions || []).map((sess: any) => ({
                id: sess.id,
                name: sess.name,
                date: sess.date,
                thumbnail: sess.thumbnail,
                items: (sess.items || []).map((i: any) => ({
                    id: i.id,
                    title: i.title,
                    type: i.type,
                    url: i.watermarked_url,
                    originalUrl: i.original_url,
                    price: i.price,
                    width: i.width,
                    height: i.height,
                    description: i.description,
                    tags: i.tags
                }))
            }))
        }))
      }));

      setGalleryData(structuredData);

    } catch (err: any) {
      console.error("Error fetching gallery:", err.message || err);
      // Fallback to mock data on error
      setGalleryData(GALLERY_DATA);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const addEventType = async (type: EventType) => {
    if (!isConfigured) {
        setGalleryData([...galleryData, type]);
        return;
    }
    const { error } = await supabase.from('event_categories').insert({
        id: type.id, 
        name: type.name,
        slug: type.slug,
        description: type.description,
        thumbnail: type.thumbnail
    });
    if (error) console.error("Error adding category:", error.message);
    else fetchGallery();
  };

  const addEvent = async (typeId: string, event: Event) => {
    if (!isConfigured) {
        const newData = galleryData.map(t => {
            if (t.id === typeId) {
                return { ...t, events: [...t.events, event] };
            }
            return t;
        });
        setGalleryData(newData);
        return;
    }
    const { error } = await supabase.from('events').insert({
        id: event.id,
        category_id: typeId,
        name: event.name,
        slug: event.slug,
        date: event.date,
        thumbnail: event.thumbnail
    });
    if (error) console.error("Error adding event:", error.message);
    else fetchGallery();
  };

  const addSession = async (typeId: string, eventId: string, session: Session) => {
    if (!isConfigured) {
        // Mock update logic
        return; 
    }
    const { error } = await supabase.from('sessions').insert({
        id: session.id,
        event_id: eventId,
        name: session.name,
        date: session.date,
        thumbnail: session.thumbnail
    });
    if (error) console.error("Error adding session:", error.message);
    else fetchGallery();
  };

  const addItemsToSession = async (typeId: string, eventId: string, sessionId: string, items: GalleryItem[]) => {
    if (!isConfigured) {
        alert("Mock Mode: Items added successfully (local state not fully persisted for complex hierarchy updates in mock mode).");
        return;
    }
    const dbItems = items.map(i => ({
        session_id: sessionId,
        title: i.title,
        type: i.type,
        watermarked_url: i.url,
        original_url: i.originalUrl,
        price: i.price,
        width: i.width,
        height: i.height,
        description: i.description,
        tags: i.tags
    }));

    const { error } = await supabase.from('gallery_items').insert(dbItems);
    if (!error) {
        // Update session thumbnail if it's the first item
        if (items.length > 0) {
           await supabase.from('sessions').update({ thumbnail: items[0].url }).eq('id', sessionId);
        }
    } else {
        console.error("Error adding items:", error.message);
    }
    fetchGallery();
  };

  const getEventType = (id: string) => galleryData.find(t => t.id === id);
  
  const getEvent = (typeId: string, eventId: string) => {
    const type = getEventType(typeId);
    return type?.events.find(e => e.id === eventId);
  };

  const getSession = (typeId: string, eventId: string, sessionId: string) => {
    const event = getEvent(typeId, eventId);
    return event?.sessions.find(s => s.id === sessionId);
  };

  return (
    <GalleryContext.Provider value={{ 
      galleryData, 
      refreshGallery: fetchGallery,
      addEventType, 
      addEvent, 
      addSession, 
      addItemsToSession,
      getEventType,
      getEvent,
      getSession
    }}>
      {children}
    </GalleryContext.Provider>
  );
};

export const useGallery = () => {
  const context = useContext(GalleryContext);
  if (!context) throw new Error('useGallery must be used within a GalleryProvider');
  return context;
};