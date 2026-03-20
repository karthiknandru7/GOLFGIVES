// ============================================================
// GLOBAL TYPE DEFINITIONS
// ============================================================

export type UserRole = 'subscriber' | 'admin'

export type SubscriptionPlan = 'monthly' | 'yearly'

export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'lapsed'

export type DrawStatus = 'pending' | 'simulated' | 'published'

export type DrawMode = 'random' | 'algorithmic'

export type MatchType = '5_match' | '4_match' | '3_match'

export type WinnerStatus = 'pending' | 'approved' | 'rejected' | 'paid'

// ============================================================
// DATABASE ROW TYPES
// ============================================================

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Charity {
  id: string
  name: string
  description: string | null
  image_url: string | null
  website_url: string | null
  is_featured: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  events?: CharityEvent[]
}

export interface CharityEvent {
  id: string
  charity_id: string
  title: string
  description: string | null
  event_date: string
  location: string | null
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: SubscriptionPlan
  status: SubscriptionStatus
  amount_pence: number
  charity_id: string | null
  charity_percentage: number
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
  charity?: Charity
}

export interface Score {
  id: string
  user_id: string
  score: number
  played_at: string
  created_at: string
}

export interface Draw {
  id: string
  draw_month: string
  status: DrawStatus
  draw_mode: DrawMode
  winning_numbers: number[]
  jackpot_amount: number
  pool_4match: number
  pool_3match: number
  jackpot_rolled: boolean
  created_at: string
  published_at: string | null
}

export interface DrawEntry {
  id: string
  draw_id: string
  user_id: string
  numbers: number[]
  match_count: number
  created_at: string
}

export interface Winner {
  id: string
  draw_id: string
  user_id: string
  match_type: MatchType
  prize_amount: number
  proof_url: string | null
  status: WinnerStatus
  admin_notes: string | null
  created_at: string
  paid_at: string | null
  profile?: Profile
  draw?: Draw
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PrizePoolBreakdown {
  jackpot: number
  fourMatch: number
  threeMatch: number
  charityTotal: number
  totalPool: number
}
