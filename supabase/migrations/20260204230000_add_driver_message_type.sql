-- Add 'driver' to the message_type enum
ALTER TYPE public.message_type ADD VALUE 'driver';

-- Add driver_id column to messages table for driver announcement messages
ALTER TABLE public.messages ADD COLUMN driver_id UUID REFERENCES public.trip_members(id) ON DELETE SET NULL;

-- Create partial index for efficient lookup of driver messages
CREATE INDEX idx_messages_driver_id ON public.messages(driver_id) WHERE driver_id IS NOT NULL;
