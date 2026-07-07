import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // must be ANON key, not service key
);

async function run() {
  // 1. Sign in as the test employee
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'employee@test.com',
    password: 'Test1234!',
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }

  console.log('Logged in as:', authData.user.id);

  // 2. Try to read expenses — should only return rows where employee_id = this user's id
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('*');

  if (expensesError) {
    console.error('Expenses query failed:', expensesError.message);
  } else {
    console.log(`Got ${expenses.length} expense row(s):`);
    console.log(expenses.map(e => ({ id: e.id, employee_id: e.employee_id, amount: e.amount })));
  }

  // 3. Try to read ALL profiles — should only see own profile (no manager/team yet)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*');

  if (profilesError) {
    console.error('Profiles query failed:', profilesError.message);
  } else {
    console.log(`Got ${profiles.length} profile row(s):`);
    console.log(profiles);
  }
}

run();