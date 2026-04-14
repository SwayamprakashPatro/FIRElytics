-- Expand schema to match app queries (profiles extra fields + health_insurance)

-- 1) Add missing columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_savings NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_investment_budget NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS property_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS home_loan_outstanding NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS home_loan_emi NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS home_loan_tenure_remaining NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS home_loan_interest_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS home_ownership_type TEXT DEFAULT 'self_occupied',
  ADD COLUMN IF NOT EXISTS fire_preferences JSONB;

-- 2) Create health_insurance table (used by app joins)
CREATE TABLE IF NOT EXISTS public.health_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sum_insured NUMERIC NOT NULL,
  annual_premium NUMERIC NOT NULL,
  family_members_covered INTEGER NOT NULL,
  includes_parents BOOLEAN NOT NULL DEFAULT false,
  city_tier TEXT NOT NULL DEFAULT 'tier1',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on health_insurance
ALTER TABLE public.health_insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own health insurance" ON public.health_insurance
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own health insurance" ON public.health_insurance
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY IF NOT EXISTS "Users can update their own health insurance" ON public.health_insurance
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own health insurance" ON public.health_insurance
  FOR DELETE USING (auth.uid() = profile_id);
