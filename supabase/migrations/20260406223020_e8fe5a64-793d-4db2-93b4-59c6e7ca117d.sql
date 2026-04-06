INSERT INTO public.retailers (retailer_name, retailer_slug, provider_name, supports_live_pricing, supports_live_inventory, retailer_status)
VALUES ('Kroger', 'kroger', 'kroger_api', true, false, 'active')
ON CONFLICT DO NOTHING;