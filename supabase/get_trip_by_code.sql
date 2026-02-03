-- Create a function to get trip preview by join code (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_trip_by_code(join_code_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trip_record RECORD;
  member_count INTEGER;
  result JSON;
BEGIN
  -- Find the trip by join code
  SELECT id, name, date_start, date_end
  INTO trip_record
  FROM trips
  WHERE join_code = UPPER(join_code_param);

  -- If no trip found, return null
  IF trip_record.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get member count
  SELECT COUNT(*) INTO member_count
  FROM trip_members
  WHERE trip_id = trip_record.id AND status = 'active';

  -- Build and return the result
  result := json_build_object(
    'id', trip_record.id,
    'name', trip_record.name,
    'date_start', trip_record.date_start,
    'date_end', trip_record.date_end,
    'member_count', member_count
  );

  RETURN result;
END;
$$;
