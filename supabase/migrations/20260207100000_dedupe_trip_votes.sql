-- Remove duplicate votes, keeping only the most recent one per user per proposal
DELETE FROM public.trip_votes
WHERE id NOT IN (
  SELECT DISTINCT ON (proposal_id, user_id) id
  FROM public.trip_votes
  ORDER BY proposal_id, user_id, updated_at DESC
);
