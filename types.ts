

export interface Project {
  id: string;
  title: string;
  category: string;
  image: string;
  description: string;
  tags: string[];
}

export interface GalleryItem {
  id: string;
  title: string;
  type: 'photo' | 'video';
  url: string; // The watermarked/preview URL for public display
  originalUrl?: string; // The "protected" original URL
  price: number;
  width: number;
  height: number;
  description?: string;
  tags?: string[];
}

export interface Session {
  id: string;
  name: string;
  date: string;
  thumbnail: string;
  items: GalleryItem[];
}

export interface Event {
  id: string;
  name: string;
  slug: string;
  date: string;
  thumbnail: string;
  sessions: Session[];
}

export interface EventType {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  events: Event[];
}

export interface CartItem extends GalleryItem {
  cartId: string;
}

export interface BookingForm {
  name: string;
  email: string;
  service: string;
  date: string;
  time?: string;
  notes: string;
}

export enum ViewState {
  TYPES = 'TYPES',
  EVENTS = 'EVENTS',
  SESSIONS = 'SESSIONS',
  GRID = 'GRID'
}

// Admin / Upload Types
export interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  watermarkedUrl: string;
  type: 'photo' | 'video';
  title: string;
  description: string;
  tags: string[];
  price: number;
  status: 'pending' | 'analyzing' | 'success' | 'error';
}

export interface PricingConfig {
  photoPrice: number;
  videoPrice: number;
}

// Client Portal Types

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  password?: string; // Added for auth simulation
  company?: string;
  phone?: string;
  address?: string;
  avatar: string;
  accountType: 'customer' | 'repeat_customer' | 'vip';
  status: 'active' | 'onboarding' | 'inactive';
  role: 'admin' | 'client';
  totalSpent: number;
  memberSince: string;
}

export type ProjectStatus = 'not_started' | 'in_progress' | 'completed' | 'uploaded';

export interface PortalProject {
  id: string;
  name: string;
  status: ProjectStatus;
  clientName: string;
  clientEmail: string;
  serviceType: string;
  eventDate: string;
  coverImage: string;
  progress: number;
  currentStep: string;
  totalSteps: number;
  manager: string;
}

export interface PortalOrder {
  id: string;
  orderNumber: string;
  date: string;
  total: number;
  items: number;
  status: 'paid' | 'pending';
  itemsList: GalleryItem[]; // Simplified
  downloadUrl?: string;
  expiresAt?: string;
}

export interface DownloadItem {
  id: string;
  fileName: string;
  fileSize: string;
  format: string;
  thumbnailUrl: string;
  orderId: string;
  orderDate: string;
  downloadsRemaining: number;
}

// Calendar & Booking Management Types
export type BookingStatus = 'confirmed' | 'cancelled' | 'pending';

export interface Booking {
  id: string;
  clientName: string;
  clientEmail: string;
  serviceType: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h)
  status: BookingStatus;
  notes?: string;
}

export interface BlackoutDate {
  id: string;
  date: string; // YYYY-MM-DD
  isFullDay: boolean;
  startTime?: string; // HH:MM if not full day
  endTime?: string; // HH:MM if not full day
  reason?: string;
}