-- Add policy allowing trip creator to view their own trip
-- This enables INSERT ... RETURNING to work properly
-- since the trigger hasn't run yet at RETURNING evaluation time
CREATE POLICY "Creator can view own trips"
ON public.trips
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);