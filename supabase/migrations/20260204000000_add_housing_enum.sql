-- Add 'housing' to the proposal_type enum
ALTER TYPE public.proposal_type ADD VALUE IF NOT EXISTS 'housing';
