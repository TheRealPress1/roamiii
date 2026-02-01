-- Drop the restrictive INSERT policy and create a permissive one
DROP POLICY IF EXISTS "Authenticated users can create trips" ON public.trips;

-- Create a PERMISSIVE INSERT policy (default is permissive)
CREATE POLICY "Users can create their own trips"
ON public.trips
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);