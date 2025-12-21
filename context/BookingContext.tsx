import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Booking, BlackoutDate } from '../types';
import { supabase, isConfigured } from '../supabaseClient';

interface BookingContextType {
  bookings: Booking[];
  blackouts: BlackoutDate[];
  addBooking: (booking: Omit<Booking, 'id' | 'status'>) => Promise<void>;
  cancelBooking: (id: string) => Promise<void>;
  addBlackout: (blackout: Omit<BlackoutDate, 'id'>) => Promise<void>;
  addBlackouts: (blackouts: Omit<BlackoutDate, 'id'>[]) => Promise<void>;
  removeBlackout: (id: string) => Promise<void>;
  isSlotAvailable: (date: string, time: string) => boolean;
  getBlackoutForDate: (date: string) => BlackoutDate[];
  getBookingsForDate: (date: string) => Booking[];
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const MOCK_BOOKINGS: Booking[] = [
    {
        id: '1',
        clientName: 'John Doe',
        clientEmail: 'john@example.com',
        serviceType: 'Photography',
        date: new Date().toISOString().split('T')[0], // Today
        time: '10:00',
        status: 'confirmed',
        notes: 'Family portrait'
    }
];

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>([]);

  const fetchData = async () => {
    if (!isConfigured) {
        setBookings(MOCK_BOOKINGS);
        return;
    }
    try {
        // Fetch Bookings
        const { data: bData, error: bError } = await supabase.from('bookings').select('*');
        if (bError) throw bError;
        
        if (bData) {
            setBookings(bData.map((b: any) => ({
                id: b.id,
                clientName: b.client_name,
                clientEmail: b.client_email,
                serviceType: b.service_type,
                date: b.booking_date,
                time: b.booking_time,
                status: b.status,
                notes: b.notes
            })));
        }

        // Fetch Blackouts
        const { data: blData } = await supabase.from('blackout_dates').select('*');
        if (blData) {
            setBlackouts(blData.map((b: any) => ({
                id: b.id,
                date: b.date,
                isFullDay: b.is_full_day,
                startTime: b.start_time,
                endTime: b.end_time,
                reason: b.reason
            })));
        }
    } catch (err) {
        console.warn("Error fetching bookings, falling back to mock data.", err);
        setBookings(MOCK_BOOKINGS);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addBooking = async (booking: Omit<Booking, 'id' | 'status'>) => {
    if (!isConfigured) {
        setBookings([...bookings, { ...booking, id: Math.random().toString(), status: 'confirmed' }]);
        return;
    }
    await supabase.from('bookings').insert({
        client_name: booking.clientName,
        client_email: booking.clientEmail,
        service_type: booking.serviceType,
        booking_date: booking.date,
        booking_time: booking.time,
        notes: booking.notes,
        status: 'confirmed'
    });
    fetchData();
  };

  const cancelBooking = async (id: string) => {
    if (!isConfigured) {
        setBookings(bookings.filter(b => b.id !== id));
        return;
    }
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    fetchData();
  };

  const addBlackout = async (blackout: Omit<BlackoutDate, 'id'>) => {
    if (!isConfigured) {
        setBlackouts([...blackouts, { ...blackout, id: Math.random().toString() }]);
        return;
    }
    await supabase.from('blackout_dates').insert({
        date: blackout.date,
        is_full_day: blackout.isFullDay,
        start_time: blackout.startTime,
        end_time: blackout.endTime,
        reason: blackout.reason
    });
    fetchData();
  };

  const addBlackouts = async (newBlackouts: Omit<BlackoutDate, 'id'>[]) => {
    if (!isConfigured) {
        const added = newBlackouts.map(b => ({ ...b, id: Math.random().toString() }));
        setBlackouts([...blackouts, ...added]);
        return;
    }
    const dbBlackouts = newBlackouts.map(b => ({
        date: b.date,
        is_full_day: b.isFullDay,
        start_time: b.startTime,
        end_time: b.endTime,
        reason: b.reason
    }));
    await supabase.from('blackout_dates').insert(dbBlackouts);
    fetchData();
  };

  const removeBlackout = async (id: string) => {
    if (!isConfigured) {
        setBlackouts(blackouts.filter(b => b.id !== id));
        return;
    }
    await supabase.from('blackout_dates').delete().eq('id', id);
    fetchData();
  };

  const getBookingsForDate = (date: string) => {
    return bookings.filter(b => b.date === date && b.status === 'confirmed');
  };

  const getBlackoutForDate = (date: string) => {
    return blackouts.filter(b => b.date === date);
  };

  const isSlotAvailable = (date: string, time: string) => {
    const dayBlackouts = blackouts.filter(b => b.date === date);
    if (dayBlackouts.some(b => b.isFullDay)) return false;

    const isBlackedOut = dayBlackouts.some(b => {
        if (!b.isFullDay && b.startTime && b.endTime) {
            return time >= b.startTime && time < b.endTime;
        }
        return false;
    });
    if (isBlackedOut) return false;

    const existing = bookings.find(b => b.date === date && b.time === time && b.status === 'confirmed');
    if (existing) return false;

    return true;
  };

  return (
    <BookingContext.Provider value={{ 
      bookings, 
      blackouts, 
      addBooking, 
      cancelBooking, 
      addBlackout,
      addBlackouts, 
      removeBlackout, 
      isSlotAvailable,
      getBlackoutForDate,
      getBookingsForDate
    }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) throw new Error('useBooking must be used within a BookingProvider');
  return context;
};
