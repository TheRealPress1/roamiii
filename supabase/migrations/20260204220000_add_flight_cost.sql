-- Add flight cost tracking to trip_members
ALTER TABLE trip_members ADD COLUMN flight_cost DECIMAL(10,2);
ALTER TABLE trip_members ADD COLUMN flight_description TEXT;
