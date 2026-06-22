// ============================================================
// Javahade Zod Validation Schemas
// ============================================================
import { z } from 'zod';

// ---- Auth ----
export const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter').max(30, 'Username maksimal 30 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirm_password: z.string(),
  gender: z.enum(['M', 'F', 'U']),
  date_of_birth: z.string().min(1, 'Tanggal lahir wajib diisi').refine((val) => {
    const birthDate = new Date(val);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 18;
  }, {
    message: 'Anda harus berusia minimal 18 tahun untuk mendaftar',
  }),
}).refine(d => d.password === d.confirm_password, {
  message: 'Password tidak cocok',
  path: ['confirm_password'],
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Email tidak valid'),
});

// ---- Creator Profile ----
export const creatorApplySchema = z.object({
  display_name: z.string().min(2, 'Nama tampilan minimal 2 karakter').max(50),
  category: z.string().min(1, 'Pilih kategori'),
  bio: z.string().max(500, 'Bio maksimal 500 karakter').optional(),
  website: z.string().url().optional().or(z.literal('')),
});

export const creatorTierSchema = z.object({
  name: z.string().min(2, 'Nama tier minimal 2 karakter').max(50),
  description: z.string().max(300).optional(),
  price: z.number().min(0, 'Harga tidak boleh negatif'),
  duration_days: z.number().int().min(1, 'Durasi minimal 1 hari'),
  benefits: z.array(z.string()).default([]),
});

export const hostBookingRateSchema = z.object({
  duration_type: z.enum(['30m', '1h', '3h', '6h', '12h', '24h', '3d', '7d', '14d', '24d', '30d', '3m']),
  price: z.number().min(0, 'Harga tidak boleh negatif'),
  currency: z.enum(['IDR', 'SGD', 'USD', 'MYR', 'CNY']),
});

// ---- KYC ----
export const kycSchema = z.object({
  document_type: z.enum(['id_card', 'passport', 'drivers_license']),
  full_name: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  birth_date: z.string().min(1, 'Tanggal lahir wajib diisi'),
  document_number: z.string().min(5, 'Nomor dokumen minimal 5 karakter'),
});

// ---- Booking ----
export const roomBookingSchema = z.object({
  room: z.string().uuid('Room ID tidak valid'),
  date: z.string().min(1, 'Tanggal wajib diisi'),
  start_time: z.string().min(1, 'Waktu mulai wajib diisi').refine((val) => {
    const [hours, minutes] = val.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes >= 7 * 60 && totalMinutes <= 22 * 60;
  }, {
    message: 'Jam mulai harus antara 07:00 dan 22:00',
  }),
  duration_hours: z.number().int().min(1, 'Durasi minimal 1 jam').max(8, 'Durasi maksimal 8 jam'),
  notes: z.string().max(500).optional(),
});

export const hostBookingSchema = z.object({
  host: z.string().uuid('Host ID tidak valid'),
  rate: z.string().uuid('Rate ID tidak valid'),
  start_datetime: z.string().min(1, 'Waktu mulai wajib diisi'),
  notes: z.string().max(500).optional(),
  meeting_location: z.string().max(200).optional(),
});

export const ratingSchema = z.object({
  user_rating_of_host: z.number().int().min(1).max(5),
  host_rating_of_user: z.number().int().min(1).max(5),
});

// ---- Content ----
export const postCreateSchema = z.object({
  content_type: z.enum(['text', 'image', 'video', 'audio']),
  title: z.string().max(100).optional(),
  body: z.string().min(1, 'Konten tidak boleh kosong').max(5000),
  media_url: z.string().url().optional().or(z.literal('')),
  is_premium: z.boolean().default(false),
  price_override: z.number().min(0).optional(),
  is_pinned: z.boolean().default(false),
  scheduled_at: z.string().optional(),
});

export const commentSchema = z.object({
  body: z.string().min(1, 'Komentar tidak boleh kosong').max(2000),
  parent: z.string().uuid().optional(),
});

// ---- Wallet ----
export const topupSchema = z.object({
  amount: z.number().min(1, 'Jumlah minimal 1'),
  currency: z.enum(['USD', 'SGD', 'IDR', 'MYR', 'CNY']),
  provider: z.enum(['paypal', 'crypto']).default('paypal'),
});

export const convertSchema = z.object({
  from_currency: z.enum(['USD', 'SGD', 'IDR', 'MYR', 'CNY']),
  to_currency: z.enum(['USD', 'SGD', 'IDR', 'MYR', 'CNY']),
  amount: z.number().min(1, 'Jumlah minimal 1'),
});

export const payoutSchema = z.object({
  amount: z.number().min(1, 'Jumlah minimal 1'),
  currency: z.enum(['IDR', 'USD']),
  method: z.enum(['bank_transfer', 'paypal', 'crypto', 'bnb', 'usdt']),
  bank_details: z.record(z.string(), z.string()).optional(),
});

export const sendGiftSchema = z.object({
  receiver: z.string().uuid('Receiver ID tidak valid'),
  gift: z.string().uuid('Gift ID tidak valid'),
  context: z.enum(['livestream', 'profile', 'private_call']),
});

// ---- Family ----
export const familyCreateSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(50),
  description: z.string().max(300).optional(),
  is_private: z.boolean().default(true),
  max_members: z.number().int().min(2).max(50).default(50),
});

export const familyJoinSchema = z.object({
  invite_code: z.string().min(4, 'Kode invite minimal 4 karakter'),
});

export const familyShareSchema = z.object({
  post: z.string().uuid('Post ID tidak valid'),
  message: z.string().max(200).optional(),
});

// ---- Streaming ----
export const streamCreateSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(100),
  is_family_only: z.boolean().default(false),
  family_group: z.string().uuid().optional(),
  ticket_price_usd: z.number().min(0).default(0),
  scheduled_time: z.string().optional(),
});

export const bountySchema = z.object({
  task_description: z.string().min(5, 'Deskripsi minimal 5 karakter').max(300),
  amount_idr: z.number().min(1000, 'Minimal Rp 1.000'),
});

// ---- Reports ----
export const reportSchema = z.object({
  content_type: z.string(),
  object_id: z.string(),
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'copyright', 'impersonation', 'other']),
  description: z.string().max(1000).optional(),
});

// ---- Chat ----
export const chatMessageSchema = z.object({
  receiver: z.string().uuid('Receiver ID tidak valid'),
  body: z.string().min(1, 'Pesan tidak boleh kosong').max(5000),
  media_url: z.string().url().optional().or(z.literal('')),
});

// ---- Settings ----
export const profileUpdateSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  gender: z.enum(['M', 'F', 'U']).optional(),
  date_of_birth: z.string().optional(),
});

export const transactionPinSchema = z.object({
  current_pin: z.string().length(6, 'PIN harus 6 digit'),
  new_pin: z.string().length(6, 'PIN harus 6 digit'),
  confirm_pin: z.string().length(6, 'PIN harus 6 digit'),
}).refine(d => d.new_pin === d.confirm_pin, {
  message: 'PIN baru tidak cocok',
  path: ['confirm_pin'],
});

// ---- Subscription ----
export const subscribeSchema = z.object({
  tier: z.string().uuid('Tier ID tidak valid'),
  auto_renew: z.boolean().default(true),
});

export const buyShareSchema = z.object({
  creator: z.string().uuid('Creator ID tidak valid'),
  shares_count: z.number().int().min(1, 'Minimal 1 saham'),
});

// ---- Inferred types ----
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreatorApplyInput = z.infer<typeof creatorApplySchema>;
export type CreatorTierInput = z.infer<typeof creatorTierSchema>;
export type HostBookingRateInput = z.infer<typeof hostBookingRateSchema>;
export type KYCInput = z.infer<typeof kycSchema>;
export type RoomBookingInput = z.infer<typeof roomBookingSchema>;
export type HostBookingInput = z.infer<typeof hostBookingSchema>;
export type RatingInput = z.infer<typeof ratingSchema>;
export type PostCreateInput = z.infer<typeof postCreateSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type TopupInput = z.infer<typeof topupSchema>;
export type ConvertInput = z.infer<typeof convertSchema>;
export type PayoutInput = z.infer<typeof payoutSchema>;
export type SendGiftInput = z.infer<typeof sendGiftSchema>;
export type FamilyCreateInput = z.infer<typeof familyCreateSchema>;
export type FamilyJoinInput = z.infer<typeof familyJoinSchema>;
export type StreamCreateInput = z.infer<typeof streamCreateSchema>;
export type BountyInput = z.infer<typeof bountySchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type TransactionPinInput = z.infer<typeof transactionPinSchema>;
export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type BuyShareInput = z.infer<typeof buyShareSchema>;
