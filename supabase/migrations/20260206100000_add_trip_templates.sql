-- Create trip_templates table
CREATE TABLE public.trip_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  destination TEXT NOT NULL,
  cover_image_url TEXT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 4,
  vibe_tags TEXT[] DEFAULT '{}',
  budget_estimate_per_person INTEGER,
  suggested_activities JSONB DEFAULT '[]',
  suggested_housing JSONB DEFAULT '[]',
  best_time_to_visit TEXT,
  local_tips TEXT,
  is_featured BOOLEAN DEFAULT false,
  category TEXT CHECK (category IN ('beach', 'city', 'adventure', 'culture', 'nature', 'romantic')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for featured templates
CREATE INDEX idx_templates_featured ON public.trip_templates(is_featured, category);
CREATE INDEX idx_templates_category ON public.trip_templates(category);
CREATE INDEX idx_templates_destination ON public.trip_templates(destination);

-- RLS - templates are publicly readable
ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates" ON public.trip_templates
FOR SELECT TO authenticated USING (true);

-- Only service role can modify templates (for admin use)
-- No insert/update/delete policies for regular users
