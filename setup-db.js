// Setup script - creates the trades table in Supabase
// Run once: node setup-db.js

const SUPABASE_URL = 'https://hapeudxgxrjhxcqqbfxb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_RPb-YueAKp8mldqD3oufuA_LPD3s6tt';

const sql = `
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  asset TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('Long', 'Short', 'Spot')),
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trades' AND policyname = 'Users can view own trades') THEN
    CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trades' AND policyname = 'Users can insert own trades') THEN
    CREATE POLICY "Users can insert own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trades' AND policyname = 'Users can update own trades') THEN
    CREATE POLICY "Users can update own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trades' AND policyname = 'Users can delete own trades') THEN
    CREATE POLICY "Users can delete own trades" ON public.trades FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trades_user_date ON public.trades (user_id, date DESC);
`;

async function setup() {
    console.log('Creating trades table in Supabase...');

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
        },
    });

    // The anon key can't run raw SQL via REST API.
    // Try the Supabase SQL endpoint instead (requires service_role key).
    // Let's try the pg-meta endpoint:
    const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
    });

    if (res2.ok) {
        const data = await res2.json();
        console.log('Success!', data);
    } else {
        const text = await res2.text();
        console.log(`Status: ${res2.status}`);
        console.log('Response:', text);
        console.log('\n--- The anon key cannot execute DDL. ---');
        console.log('You need to run the SQL manually in the Supabase dashboard.');
        console.log('Go to: https://supabase.com/dashboard/project/hapeudxgxrjhxcqqbfxb/sql/new');
    }
}

setup().catch(console.error);
