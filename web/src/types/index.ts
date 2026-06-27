// ============================================================
// Javahade Types — migrated from Django models
// ============================================================

export type UserRole = "user" | "host" | "admin" | "superadmin";
export type Gender = "M" | "F" | "U";
export type Currency = "USD" | "SGD" | "IDR" | "MYR" | "CNY";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type HostBookingStatus =
  | "pending_payment"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "disputed";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PaymentProvider = "stripe" | "midtrans" | "xendit" | "crypto" | "paypal";
export type PaymentType =
  | "subscription"
  | "tip"
  | "content_purchase"
  | "gift"
  | "booking";
export type KYCStatus = "pending" | "approved" | "rejected";
export type KYCDocType = "id_card" | "passport" | "drivers_license";
export type SubscriptionStatus = "active" | "expired" | "cancelled" | "pending";
export type ContentType = "text" | "image" | "video" | "audio";
export type NotificationType =
  | "new_subscriber"
  | "new_like"
  | "new_comment"
  | "new_post"
  | "new_message"
  | "family_invite"
  | "family_join"
  | "new_host_booking"
  | "booking_confirmed"
  | "booking_cancelled"
  | "stream_started"
  | "payout_completed"
  | "system";
export type ReportReason =
  | "spam"
  | "harassment"
  | "inappropriate"
  | "copyright"
  | "impersonation"
  | "other";
export type ReportStatus = "pending" | "reviewed" | "actioned" | "dismissed";
export type FamilyRole = "owner" | "admin" | "member";
export type StreamStatus = "live" | "ended" | "scheduled";
export type DurationType =
  | "30m"
  | "1h"
  | "3h"
  | "6h"
  | "12h"
  | "24h"
  | "3d"
  | "7d"
  | "14d"
  | "24d"
  | "30d"
  | "3m";
export type PayoutMethod =
  | "bank_transfer"
  | "paypal"
  | "crypto"
  | "bnb"
  | "usdt";
export type PayoutStatus = "pending" | "processing" | "completed" | "failed";
export type TransactionType =
  | "deposit"
  | "withdraw"
  | "earning"
  | "refund"
  | "subscription"
  | "ticket"
  | "fee_deduction";

// ---- User & Accounts ----
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  cover_image?: string;
  bio?: string;
  gender: Gender;
  role: UserRole;
  is_verified: boolean;
  date_of_birth?: string;
  balance_usd: number;
  balance_sgd: number;
  balance_idr: number;
  balance_myr: number;
  balance_cny: number;
  is_elite_fan: boolean;
  has_accepted_cookies: boolean;
  is_2fa_enabled: boolean;
  created_at: string;
}

export interface CreatorProfile {
  id: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
    bio?: string;
    role: string;
    is_verified: boolean;
  } | string;
  username?: string;
  display_name: string;
  bio?: string;
  category: string;
  avatar?: string;
  cover_image?: string;
  subscription_price: number;
  earnings_balance: number;
  total_earnings: number;
  platform_commission_rate: number;
  is_exclusive_host: boolean;
  subscriber_count: number;
  is_approved: boolean;
  approved_at?: string;
  website?: string;
  social_links?: Record<string, string>;
  seo_tags?: string[];
  post_count?: number;
  rating?: number;
  review_count?: number;
}

export interface CreatorPhoto {
  id: string;
  profile: string;
  image: string;
  created_at: string;
}

export interface KYCDocument {
  id: string;
  user: string;
  document_type: KYCDocType;
  full_name: string;
  birth_date: string;
  document_number: string;
  document_file: string;
  selfie_file: string;
  status: KYCStatus;
  reviewer_notes?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export interface HostBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  bonus_idr: number;
}

export interface HostAchievement {
  id: string;
  host: string;
  badge: string;
  awarded_at: string;
  bonus_paid: boolean;
}

// ---- Booking (Go Service) ----
export interface BookingSlot {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  max_seats: number;
  price: number;
  currency: Currency;
  status: BookingStatus;
  created_at: string;
}

export interface Booking {
  id: string;
  slot_id: string;
  user_id: string;
  seat_num: number;
  status: BookingStatus;
  created_at: string;
}

// ---- Legacy Booking (Django template view, kept for compatibility) ----
export interface Room {
  id: string;
  name: string;
  description: string;
  capacity: number;
  location: string;
  hourly_rate: number;
  is_active: boolean;
  image_url?: string;
  created_at: string;
}

export interface HostBookingRate {
  id: string;
  host: string;
  duration_type: DurationType;
  price: number;
  currency: Currency;
  is_active: boolean;
}

export interface HostBooking {
  id: string;
  user: string;
  host: string;
  rate: string;
  start_datetime: string;
  end_datetime: string;
  status: HostBookingStatus;
  notes?: string;
  meeting_location?: string;
  is_no_show_cancelled: boolean;
  reschedule_count: number;
  currency: Currency;
  total_cost: number;
  app_tax_fee: number;
  service_fee: number;
  admin_fee: number;
  validation_fee: number;
  other_fee: number;
  net_payout: number;
  idempotency_key: string;
  created_at: string;
}

export interface BookingRating {
  id: string;
  booking: string;
  user_rating_of_host: number;
  host_rating_of_user: number;
}

export interface HostBookingDispute {
  id: string;
  booking: string;
  raised_by: string;
  reason: string;
  evidence_url?: string;
  status: "open" | "resolved_host" | "resolved_client";
  admin_notes?: string;
}

// ---- Content ----
export interface Post {
  id: string;
  creator: string;
  content_type: ContentType;
  title?: string;
  body: string;
  media_url?: string;
  thumbnail?: string;
  is_premium: boolean;
  price_override?: number;
  like_count: number;
  unlike_count: number;
  comment_count: number;
  view_count: number;
  quality_score: number;
  is_published: boolean;
  is_pinned: boolean;
  scheduled_at?: string;
  created_at: string;
  creator_profile?: CreatorProfile;
  is_liked?: boolean;
  is_unliked?: boolean;
}

export interface Comment {
  id: string;
  post: string;
  user: {
    id: string;
    username: string;
    display_name?: string;
    avatar?: string;
  };
  body: string;
  parent?: string;
  like_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Like {
  id: string;
  post: string;
  user: string;
  is_unlike: boolean;
  created_at: string;
}

export interface Story {
  id: string;
  creator: string;
  media_file: string;
  caption?: string;
  view_count: number;
  expires_at: string;
  created_at: string;
  creator_profile?: CreatorProfile;
}

// ---- Payments & Wallet ----
export interface PaymentIntent {
  id: string;
  user: string;
  recipient?: string;
  amount: number;
  currency: Currency;
  payment_type: PaymentType;
  status: PaymentStatus;
  provider: PaymentProvider;
  provider_ref?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Payout {
  id: string;
  creator: string;
  amount: number;
  currency: Currency;
  method: PayoutMethod;
  status: PayoutStatus;
  bank_details?: Record<string, string>;
  processed_at?: string;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  user: string;
  transaction_type: TransactionType;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  reference_id?: string;
  notes?: string;
  created_at: string;
}

export interface VirtualGift {
  id: string;
  name: string;
  icon: string;
  price_idr: number;
  is_active: boolean;
}

export interface GiftTransaction {
  id: string;
  sender: string;
  receiver: string;
  gift: string;
  amount_idr: number;
  platform_fee_idr: number;
  net_host_amount_idr: number;
  context: "livestream" | "profile" | "private_call";
  created_at: string;
}

export interface StreamBounty {
  id: string;
  host: string;
  challenger: string;
  task_description: string;
  amount_idr: number;
  status: "pending" | "accepted" | "completed" | "rejected" | "failed";
  created_at: string;
}

// ---- Subscriptions ----
export interface SubscriptionTier {
  id: string;
  creator: string;
  name: string;
  description?: string;
  price: number;
  duration_days: number;
  benefits: string[];
  is_active: boolean;
  sort_order: number;
}

export interface Subscription {
  id: string;
  subscriber: string;
  tier: string;
  status: SubscriptionStatus;
  starts_at: string;
  expires_at: string;
  auto_renew: boolean;
  payment_ref?: string;
}

export interface PlatformRatingAccess {
  id: string;
  user: string;
  package_type: "premium" | "vip";
  expires_at: string;
}

export interface CreatorShare {
  id: string;
  investor: string;
  creator: string;
  shares_count: number;
  total_dividends_earned: number;
}

// ---- Family Groups ----
export interface FamilyGroup {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  owner: string;
  max_members: number;
  is_private: boolean;
  invite_code: string;
  member_count: number;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  family: string;
  user: {
    id: string;
    username: string;
    display_name?: string;
    avatar?: string;
  };
  role: FamilyRole;
  joined_at: string;
}

export interface FamilyContent {
  id: string;
  family: string;
  post: Post;
  shared_by: {
    id: string;
    username: string;
    display_name?: string;
    avatar?: string;
  };
  message?: string;
  shared_at: string;
}

// ---- Notifications ----
export interface Notification {
  id: string;
  user: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// ---- Moderation ----
export interface Report {
  id: string;
  reporter: string;
  content_type: string;
  object_id: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  moderator_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user: string;
  action_type: "auth" | "finance" | "moderation" | "system" | "other";
  description: string;
  ip_address: string;
  created_at: string;
}

// ---- Live Streaming ----
export interface LiveStream {
  id: string;
  host: string;
  title: string;
  stream_key?: string;
  status: StreamStatus;
  is_family_only: boolean;
  family_group?: string;
  ticket_price_usd: number;
  scheduled_time?: string;
  is_deleted: boolean;
  viewer_count?: number;
  created_at: string;
  host_profile?: CreatorProfile;
  has_ticket?: boolean;
}

export interface StreamTicket {
  id: string;
  stream: string;
  user: string;
  price_paid: number;
}

// ---- Chat ----
export interface ChatMessage {
  id: string;
  sender: string;
  receiver: string;
  body: string;
  type?: string;
  metadata?: Record<string, any>;
  media_url?: string;
  is_read: boolean;
  created_at: string;
  sender_profile?: { username: string; avatar?: string };
}

export interface ChatConversation {
  username: string;
  displayName?: string;
  avatar?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  isOnline?: boolean;
}

// ---- API Responses ----
export interface PaginatedResponse<T> {
  results: T[];
  next?: string | null;
  previous?: string | null;
  count: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

// ---- Chart Data ----
export interface WalletChartData {
  labels: string[];
  deposits: number[];
  withdrawals: number[];
  earnings: number[];
}

export interface EarningsChartData {
  labels: string[];
  subscriptions: number[];
  tips: number[];
  bookings: number[];
  gifts: number[];
}

// ---- Navigation ----
export type NavPage =
  | "feed"
  | "search"
  | "creator"
  | "booking"
  | "wallet"
  | "streaming"
  | "chat"
  | "family"
  | "admin"
  | "settings"
  | "kyc"
  | "become_host"
  | "manage_tiers"
  | "login"
  | "register";
