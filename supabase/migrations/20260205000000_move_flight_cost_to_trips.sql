-- Move flight cost from per-member to trip-level
-- One price applies to all flying members equally

ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS flight_cost DECIMAL(10,2);

ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS flight_description TEXT;
