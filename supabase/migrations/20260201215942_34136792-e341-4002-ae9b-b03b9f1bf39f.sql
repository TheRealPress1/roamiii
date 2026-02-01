-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  actor_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- RLS Policies
-- Users can only read their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can update their own notifications (to mark read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can insert notifications for trip members
CREATE POLICY "Trip members can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid() 
  AND (
    trip_id IS NULL 
    OR is_trip_member(trip_id, user_id)
  )
);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Helper function to notify all trip members except actor
CREATE OR REPLACE FUNCTION public.notify_trip_members(
  _trip_id UUID,
  _actor_id UUID,
  _type TEXT,
  _title TEXT,
  _body TEXT DEFAULT NULL,
  _href TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, trip_id, actor_id, type, title, body, href)
  SELECT 
    tm.user_id,
    _trip_id,
    _actor_id,
    _type,
    _title,
    _body,
    _href
  FROM public.trip_members tm
  WHERE tm.trip_id = _trip_id
    AND tm.user_id != _actor_id;
END;
$$;