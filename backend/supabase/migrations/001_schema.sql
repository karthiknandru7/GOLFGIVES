-- ============================================================
-- GOLF CHARITY PLATFORM — DATABASE SCHEMA
-- Run this in Supabase SQL Editor (new project)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  role            TEXT NOT NULL DEFAULT 'subscriber' CHECK (role IN ('subscriber', 'admin')),
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHARITIES
-- ============================================================
CREATE TABLE public.charities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,
  website_url     TEXT,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE public.subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  plan                  TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'lapsed')),
  amount_pence          INTEGER NOT NULL,
  charity_id            UUID REFERENCES public.charities(id),
  charity_percentage    INTEGER NOT NULL DEFAULT 10 CHECK (charity_percentage BETWEEN 10 AND 100),
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GOLF SCORES (rolling 5-score system)
-- ============================================================
CREATE TABLE public.scores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score       INTEGER NOT NULL CHECK (score BETWEEN 1 AND 45),
  played_at   DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup of latest 5 scores per user
CREATE INDEX idx_scores_user_date ON public.scores (user_id, played_at DESC);

-- ============================================================
-- DRAWS
-- ============================================================
CREATE TABLE public.draws (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_month      DATE NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'simulated', 'published')),
  draw_mode       TEXT NOT NULL DEFAULT 'random' CHECK (draw_mode IN ('random', 'algorithmic')),
  winning_numbers INTEGER[] NOT NULL DEFAULT '{}',
  jackpot_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  pool_4match     NUMERIC(10,2) NOT NULL DEFAULT 0,
  pool_3match     NUMERIC(10,2) NOT NULL DEFAULT 0,
  jackpot_rolled  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at    TIMESTAMPTZ
);

-- ============================================================
-- DRAW ENTRIES (each subscriber's 5 numbers for the draw)
-- ============================================================
CREATE TABLE public.draw_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id     UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  numbers     INTEGER[] NOT NULL,
  match_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (draw_id, user_id)
);

-- ============================================================
-- WINNERS
-- ============================================================
CREATE TABLE public.winners (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id         UUID NOT NULL REFERENCES public.draws(id),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  match_type      TEXT NOT NULL CHECK (match_type IN ('5_match', '4_match', '3_match')),
  prize_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  proof_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at         TIMESTAMPTZ
);

-- ============================================================
-- CHARITY EVENTS
-- ============================================================
CREATE TABLE public.charity_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  charity_id  UUID NOT NULL REFERENCES public.charities(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  event_date  DATE NOT NULL,
  location    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charity_events ENABLE ROW LEVEL SECURITY;

-- Profiles: users see own, admins see all
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Scores: users manage own
CREATE POLICY "Users manage own scores"
  ON public.scores FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all scores"
  ON public.scores FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Subscriptions: users see own
CREATE POLICY "Users view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all subscriptions"
  ON public.subscriptions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Draws: everyone can view published, admin manages all
CREATE POLICY "Public view published draws"
  ON public.draws FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins manage draws"
  ON public.draws FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Draw entries: users see own
CREATE POLICY "Users view own entries"
  ON public.draw_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage entries"
  ON public.draw_entries FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Winners: users see own
CREATE POLICY "Users view own winnings"
  ON public.winners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage winners"
  ON public.winners FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Charities & Events: public read, admin write
CREATE POLICY "Public view active charities"
  ON public.charities FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins manage charities"
  ON public.charities FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY "Public view charity events"
  ON public.charity_events FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins manage charity events"
  ON public.charity_events FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Rolling 5-score: delete oldest when 6th score inserted
CREATE OR REPLACE FUNCTION public.enforce_rolling_scores()
RETURNS TRIGGER AS $$
DECLARE
  score_count INTEGER;
  oldest_id   UUID;
BEGIN
  SELECT COUNT(*) INTO score_count
  FROM public.scores WHERE user_id = NEW.user_id;

  IF score_count >= 5 THEN
    SELECT id INTO oldest_id
    FROM public.scores
    WHERE user_id = NEW.user_id
    ORDER BY played_at ASC, created_at ASC
    LIMIT 1;

    DELETE FROM public.scores WHERE id = oldest_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_rolling_scores_trigger
  BEFORE INSERT ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rolling_scores();

-- ============================================================
-- SEED: Sample charities
-- ============================================================
INSERT INTO public.charities (name, description, is_featured, is_active) VALUES
  ('Golf Foundation', 'Growing the game of golf and supporting young players from all backgrounds.', TRUE, TRUE),
  ('Cancer Research UK', 'World-leading cancer research to bring forward the day when cancer is cured.', FALSE, TRUE),
  ('Age UK Golf Days', 'Connecting older adults through golf and community fundraising events.', FALSE, TRUE),
  ('Youth Sport Trust', 'Building a healthy and happy nation through sport and physical activity.', FALSE, TRUE);
