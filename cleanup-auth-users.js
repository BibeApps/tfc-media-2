// Cleanup script to delete orphaned users from Supabase Auth
// Run with: node cleanup-auth-users.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://alboektvgruofwtxuhfo.supabase.co';
// You need to add your service role key here
// Get it from: https://supabase.com/dashboard/project/alboektvgruofwtxuhfo/settings/api
const supabaseServiceRoleKey = 'YOUR_SERVICE_ROLE_KEY_HERE';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const emailsToDelete = [
    'bob.admin.test.99@gmail.com',
    'okunor.niio@gmail.com'
];

async function deleteOrphanedUsers() {
    console.log('Finding users to delete...\n');

    for (const email of emailsToDelete) {
        try {
            // First, find the user by email
            const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

            if (listError) {
                console.error(`Error listing users: ${listError.message}`);
                continue;
            }

            const user = users.find(u => u.email === email);

            if (!user) {
                console.log(`❌ User not found: ${email}`);
                continue;
            }

            console.log(`Found user: ${email} (ID: ${user.id})`);

            // Delete the user
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

            if (deleteError) {
                console.error(`❌ Error deleting ${email}: ${deleteError.message}`);
            } else {
                console.log(`✅ Successfully deleted: ${email}\n`);
            }
        } catch (error) {
            console.error(`❌ Unexpected error for ${email}:`, error.message);
        }
    }

    console.log('Cleanup complete!');
}

deleteOrphanedUsers();
