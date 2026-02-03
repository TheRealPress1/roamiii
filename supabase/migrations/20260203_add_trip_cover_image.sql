-- Add cover_image_url column to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN trips.cover_image_url IS 'Custom cover image URL for the trip, editable by trip owner';
