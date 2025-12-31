
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// For deleting rows via RLS policy, normally you need service role key
// OR the policy must allow anon deletion.
// IF this fails with anon key, we'll need the user to paste their SERVICE_ROLE_KEY or use SQL.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('🧹 Cleaning up test data...');

    // 1. Debug: List top 5 rows to verify request visibility
    const { data, error } = await supabase
        .from('scores')
        .select('nickname, score')
        .limit(5);

    if (error) {
        console.error('Error fetching rows:', error);
        return;
    }

    console.log('👀 DEBUG: Top 5 rows visible to script:', data);

    // 2. Delete Pro_Players
    const { error: err1, count: c1 } = await supabase
        .from('scores')
        .delete({ count: 'exact' })
        .ilike('nickname', 'pro_player%');

    if (!err1) console.log(`✅ Deleted ${c1} 'pro_player%' entries.`);

    // 3. Delete Player_X
    const { error: err2, count: c2 } = await supabase
        .from('scores')
        .delete({ count: 'exact' })
        .ilike('nickname', 'Player_%');

    if (!err2) console.log(`✅ Deleted ${c2} 'Player_%' entries.`);

    // Combine errors for final logging
    const deleteError = err1 || err2;

    if (deleteError) {
        console.error('❌ Error deleting rows:', deleteError);
        console.log('💡 TIP: If this failed due to permissions, user the SQL Editor in Supabase Dashboard instead:');
        console.log("DELETE FROM scores WHERE nickname LIKE 'pro_player%';");
    } else {
        console.log('✅ Successfully deleted test scores.');
    }
}

cleanup();
