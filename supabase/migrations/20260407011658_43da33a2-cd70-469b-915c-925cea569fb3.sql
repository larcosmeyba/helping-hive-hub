
-- Clear stale Kroger certification-environment product IDs and prices
-- so production environment can re-populate fresh data

DELETE FROM store_product_prices
WHERE retailer_id IN (SELECT retailer_id FROM retailers WHERE retailer_slug = 'kroger');

DELETE FROM retailer_products
WHERE retailer_id IN (SELECT retailer_id FROM retailers WHERE retailer_slug = 'kroger');

DELETE FROM provider_sync_logs
WHERE provider_name = 'kroger_api';
