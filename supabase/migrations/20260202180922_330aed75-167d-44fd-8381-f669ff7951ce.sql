-- Add missing foreign key constraint for notifications.actor_id -> profiles.id
ALTER TABLE notifications 
ADD CONSTRAINT notifications_actor_id_fkey 
FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;