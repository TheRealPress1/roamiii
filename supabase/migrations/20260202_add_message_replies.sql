-- Add reply threading to messages
-- Messages can reply to other messages (including proposal messages)

ALTER TABLE public.messages
ADD COLUMN reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Index for efficient reply lookups
CREATE INDEX idx_messages_reply_to_id ON public.messages(reply_to_id);

-- Comment for documentation
COMMENT ON COLUMN public.messages.reply_to_id IS 'References the parent message this is a reply to (for threading)';
