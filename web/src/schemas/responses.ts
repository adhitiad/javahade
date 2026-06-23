import { z } from "zod";

// --- Base Types ---
const GenderSchema = z.enum(["M", "F", "U"]);
const UserRoleSchema = z.enum(["user", "host", "admin", "superadmin"]);
const CurrencySchema = z.enum(["USD", "SGD", "IDR", "MYR", "CNY"]);
const BookingStatusSchema = z.enum(["pending", "confirmed", "cancelled", "completed"]);
const PaymentStatusSchema = z.enum(["pending", "completed", "failed", "refunded"]);

// --- User & Profile ---
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  avatar: z.string().nullish().transform(v => v ?? undefined),
  bio: z.string().nullish().transform(v => v ?? undefined),
  gender: GenderSchema,
  role: UserRoleSchema,
  is_verified: z.boolean().default(false),
  date_of_birth: z.string().nullish().transform(v => v ?? undefined),
  balance_usd: z.number().default(0),
  balance_sgd: z.number().default(0),
  balance_idr: z.number().default(0),
  balance_myr: z.number().default(0),
  balance_cny: z.number().default(0),
  is_elite_fan: z.boolean().default(false),
  has_accepted_cookies: z.boolean().default(false),
  created_at: z.string(),
}).catchall(z.any()); // Allow extra fields

export const creatorProfileResponseSchema = z.object({
  id: z.string(),
  user: z.string(),
  display_name: z.string(),
  bio: z.string().nullish().transform(v => v ?? undefined),
  category: z.string(),
  avatar: z.string().nullish().transform(v => v ?? undefined),
  cover_image: z.string().nullish().transform(v => v ?? undefined),
  subscription_price: z.number(),
  earnings_balance: z.number(),
  total_earnings: z.number(),
  platform_commission_rate: z.number(),
  is_exclusive_host: z.boolean(),
  subscriber_count: z.number(),
  is_approved: z.boolean(),
  approved_at: z.string().nullish().transform(v => v ?? undefined),
}).catchall(z.any());

// --- Wallet ---
export const walletTransactionResponseSchema = z.object({
  id: z.string(),
  user: z.string().nullish().transform(v => v ?? undefined),
  type: z.string().optional(),
  transaction_type: z.string().optional(),
  amount: z.union([z.number(), z.string()]), // API might return string or number
  currency: CurrencySchema,
  status: PaymentStatusSchema,
  reference_id: z.string().nullish().transform(v => v ?? undefined),
  notes: z.string().nullish().transform(v => v ?? undefined),
  created_at: z.string(),
}).catchall(z.any());

export const exchangeRatesResponseSchema = z.object({
  base: z.string(),
  rates: z.record(z.string(), z.number()),
  timestamp: z.number(),
}).catchall(z.any());

export const earningsResponseSchema = z.object({
  balances: z.record(CurrencySchema, z.union([z.number(), z.string()])),
  is_creator: z.boolean().default(false),
  transactions: z.array(walletTransactionResponseSchema).default([]),
}).catchall(z.any());

// --- Booking ---
export const bookingSlotResponseSchema = z.object({
  id: z.string(),
  creator_id: z.string(),
  title: z.string(),
  description: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  max_seats: z.number(),
  price: z.number(),
  currency: CurrencySchema,
  status: BookingStatusSchema,
  created_at: z.string(),
}).catchall(z.any());

export const bookingResponseSchema = z.object({
  id: z.string(),
  slot_id: z.string(),
  user_id: z.string(),
  seat_num: z.number().default(1),
  status: BookingStatusSchema,
  created_at: z.string(),
}).catchall(z.any());

// --- Content ---
export const postResponseSchema = z.object({
  id: z.string(),
  creator: z.string(),
  content_type: z.enum(["text", "image", "video", "audio"]),
  title: z.string().nullish().transform(v => v ?? undefined),
  body: z.string(),
  media_url: z.string().nullish().transform(v => v ?? undefined),
  thumbnail: z.string().nullish().transform(v => v ?? undefined),
  is_premium: z.boolean(),
  price_override: z.number().nullish().transform(v => v ?? undefined),
  like_count: z.number().default(0),
  unlike_count: z.number().default(0),
  comment_count: z.number().default(0),
  view_count: z.number().default(0),
  quality_score: z.number().default(0),
  is_published: z.boolean().default(true),
  is_pinned: z.boolean().default(false),
  scheduled_at: z.string().nullish().transform(v => v ?? undefined),
  created_at: z.string(),
}).catchall(z.any());

export const storyResponseSchema = z.object({
  id: z.string(),
  creator: z.string(),
  media_file: z.string(),
  caption: z.string().nullish().transform(v => v ?? undefined),
  view_count: z.number().default(0),
  expires_at: z.string(),
  created_at: z.string(),
}).catchall(z.any());

export const commentResponseSchema = z.object({
  id: z.string(),
  post: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    display_name: z.string().nullish().transform(v => v ?? undefined),
    avatar: z.string().nullish().transform(v => v ?? undefined),
  }),
  body: z.string(),
  parent: z.string().nullish().transform(v => v ?? undefined),
  like_count: z.number().default(0),
  is_deleted: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
}).catchall(z.any());

export function paginatedResponseSchema<T>(itemSchema: z.ZodType<T>) {
  return z.object({
    results: z.array(itemSchema),
    next: z.string().nullish().transform(v => v ?? undefined),
    previous: z.string().nullish().transform(v => v ?? undefined),
    count: z.number(),
  }).catchall(z.any());
}
