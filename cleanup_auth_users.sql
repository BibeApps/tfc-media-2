-- This SQL won't work directly because auth.users is protected
-- Instead, use the Supabase CLI commands below:

-- To delete users from Supabase Auth, run these commands in your terminal:

-- First, get the user IDs:
SELECT id, email FROM auth.users WHERE email IN ('bob.admin.test.99@gmail.com', 'okunor.niio@gmail.com');

-- Then use the Supabase CLI to delete them:
-- supabase db execute "SELECT auth.delete_user('USER_ID_HERE');"

-- Or use the admin API via SQL function (if you have one set up):
-- This requires a custom function that uses the service role
