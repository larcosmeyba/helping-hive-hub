-- Part 3 frontend security migration
-- 1) Atomic SNAP balance deduction RPC
CREATE OR REPLACE FUNCTION public.deduct_snap_balance(_tracking_id uuid, _amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance numeric;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  UPDATE public.snap_benefit_tracking
     SET current_balance = GREATEST(0, current_balance - _amount),
         updated_at = now()
   WHERE id = _tracking_id
     AND user_id = auth.uid()
  RETURNING current_balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Tracking row not found or not owned by caller';
  END IF;

  RETURN new_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deduct_snap_balance(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_snap_balance(uuid, numeric) TO authenticated;

-- 2) Server-side support ticket creation (email reconstructed from auth.users)
CREATE OR REPLACE FUNCTION public.create_support_ticket(
  _name text,
  _message text,
  _ticket_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket_id uuid;
  caller_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  IF _message IS NULL OR length(trim(_message)) = 0 THEN
    RAISE EXCEPTION 'Message is required';
  END IF;
  IF _ticket_type NOT IN ('help','bug','feature') THEN
    RAISE EXCEPTION 'Invalid ticket type';
  END IF;

  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.support_tickets (user_id, name, email, message, ticket_type)
  VALUES (auth.uid(), left(_name, 200), caller_email, left(_message, 5000), _ticket_type)
  RETURNING id INTO ticket_id;

  RETURN ticket_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_support_ticket(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_support_ticket(text, text, text) TO authenticated;

-- 3) Persist questionnaire progress server-side
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS questionnaire_progress jsonb;