-- Create link_previews table for caching OpenGraph metadata
CREATE TABLE IF NOT EXISTS public.link_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  image_url TEXT,
  site_name TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for URL lookups
CREATE INDEX IF NOT EXISTS idx_link_previews_url ON public.link_previews(url);

-- Enable RLS
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read link previews (they're public metadata)
CREATE POLICY "Anyone can read link previews"
  ON public.link_previews
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to insert/update previews
CREATE POLICY "Service can manage link previews"
  ON public.link_previews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to insert (for edge function)
CREATE POLICY "Authenticated can insert link previews"
  ON public.link_previews
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE public.link_previews IS 'Cached OpenGraph metadata for URLs shared in chat';
