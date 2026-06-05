-- 1. user_roles: only owners can manage roles (remove admin escalation)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- 2. ai_config: restrict SELECT to admins
DROP POLICY IF EXISTS "Anyone authenticated can read ai_config" ON public.ai_config;
-- existing "Admins can manage ai_config" (ALL) already covers admin SELECT

-- 3. realtime.messages: replace ELSE TRUE with explicit deny
DROP POLICY IF EXISTS "Authenticated users can subscribe to allowed topics" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can subscribe to notifications topic" ON realtime.messages;

CREATE POLICY "Authenticated can subscribe to own notifications topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() LIKE 'notifications:' || auth.uid()::text)
);