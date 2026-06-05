DROP POLICY IF EXISTS "Users can subscribe to own notification channel" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can subscribe to own notifications topic" ON realtime.messages;

CREATE POLICY "Authenticated can subscribe to own notifications topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notifications:' || auth.uid()::text
);