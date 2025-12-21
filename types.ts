
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
  session_id?: string;
  title: string;
  type: 'photo' | 'video';
  url: string; // The watermarked/preview URL for public display
  watermarked_url?: string; // Explicit watermarked URL from DB
  originalUrl?: string; // The "protected" original URL
  original_url?: string; // DB field name
  price: number;
  width?: number;
  height?: number;
  description?: string;
  tags?: string[];
  created_at?: string;
}

export interface Session {
  id: string;
  event_id?: string;
  name: string;
  date: string;
  thumbnail: string;
  items?: GalleryItem[];
  archived?: boolean;
  created_at?: string;
}

export interface Event {
  id: string;
  category_id?: string;
  client_id?: string;
  name: string;
  slug: string;
  date: string;
  thumbnail: string;
  sessions?: Session[];
  archived?: boolean;
  created_at?: string;
}

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  events?: Event[];
  archived?: boolean;
  created_at?: string;
}

// Legacy type alias for compatibility
export interface EventType extends EventCategory { }

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
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  avatar?: string;
  accountType: 'customer' | 'repeat_customer' | 'vip';
  account_type?: string; // DB field name
  status: 'active' | 'onboarding' | 'inactive';
  role: 'admin' | 'client';
  totalSpent: number;
  total_spent?: number; // DB field name
  memberSince: string;
  member_since?: string; // DB field name
}

// Profile type matching Supabase schema
export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'client';
  account_type: 'customer' | 'repeat_customer' | 'vip';
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country: string;
  total_spent: number;
  member_since: string;
  status: 'active' | 'onboarding' | 'inactive';
}

export type ProjectStatus = 'not_started' | 'in_progress' | 'completed' | 'uploaded';

export interface PortalProject {
  id: string;
  client_id?: string;
  name: string;
  status: ProjectStatus;
  clientName: string;
  client_name?: string; // DB field name
  clientEmail: string;
  client_email?: string; // DB field name
  serviceType: string;
  service_type?: string; // DB field name
  eventDate: string;
  event_date?: string; // DB field name
  coverImage: string;
  cover_image?: string; // DB field name
  progress: number;
  currentStep: string;
  current_step?: string; // DB field name
  totalSteps: number;
  total_steps?: number; // DB field name
  manager: string;
  created_at?: string;
}

export interface PortalOrder {
  id: string;
  client_id?: string;
  orderNumber: string;
  order_number?: string; // DB field name
  date: string;
  total: number;
  total_amount?: number; // DB field name
  items: number;
  status: 'paid' | 'pending' | 'completed' | 'refunded';
  itemsList?: GalleryItem[]; // Simplified
  downloadUrl?: string;
  expiresAt?: string;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  amount_refunded?: number;
  currency?: string;
  refund_reason?: string;
  refunded_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  gallery_item_id: string;
  price: number;
  gallery_item?: GalleryItem;
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
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  clientName: string;
  client_name?: string; // DB field name
  clientEmail: string;
  client_email?: string; // DB field name
  serviceType: string;
  service_type?: string; // DB field name
  date: string; // YYYY-MM-DD
  bookingDate?: string; // DB field name
  booking_date?: string; // DB field name
  time: string; // Start time in 12-hour format (e.g., "10:00 AM")
  bookingTime?: string; // DB field name
  booking_time?: string; // DB field name
  endTime?: string; // End time in 12-hour format (e.g., "02:00 PM")
  end_time?: string; // DB field name
  phone?: string; // Optional phone number
  status: BookingStatus;
  notes?: string;
  created_at?: string;
}

export interface BlackoutDate {
  id: string;
  date: string; // YYYY-MM-DD
  isFullDay: boolean;
  is_full_day?: boolean; // DB field name
  startTime?: string; // HH:MM if not full day
  start_time?: string; // DB field name
  endTime?: string; // HH:MM if not full day
  end_time?: string; // DB field name
  reason?: string;
}

// Portfolio Types
export interface PortfolioProject {
  id: string;
  title: string;
  category: string;
  image_url: string;
  description: string;
  tags: string[];
  created_at: string;
  display_order: number;
}

// Team Member Types
export interface TeamMember {
  id: string;
  name: string;
  title: string;
  image_url: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Notification Types
export interface NotificationRecipients {
  sms: boolean;
  email: boolean;
  recipients: ('client' | 'admin')[];
}

export interface NotificationConfig {
  order_placed?: NotificationRecipients;
  booking_created?: NotificationRecipients;
  order_completed?: NotificationRecipients;
  new_user_created?: NotificationRecipients;
  booking_confirmed?: NotificationRecipients;
  gallery_published?: NotificationRecipients;
  project_files_ready?: NotificationRecipients;
  project_status_update?: NotificationRecipients;
}

export interface SMSNotifications {
  project_ready: boolean;
  order_completed: boolean;
  booking_confirmed: boolean;
}

export interface NotificationSettings {
  id: string;
  email_enabled: boolean;
  email_from_name: string;
  email_from_address: string;
  sms_enabled: boolean;
  sms_notifications: SMSNotifications;
  notifications: NotificationConfig;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  custom_templates: Record<string, any>;
  updated_at: string;
  updated_by?: string;
}