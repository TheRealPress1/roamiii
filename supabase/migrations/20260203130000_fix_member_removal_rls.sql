-- Allow admins/owners to update member status (for removing members)
-- The existing policy only allows users to update their own membership

CREATE POLICY "Admins can update member status" ON public.trip_members
FOR UPDATE USING (
  is_trip_admin(trip_id, auth.uid())
)
WITH CHECK (
  is_trip_admin(trip_id, auth.uid())
);
