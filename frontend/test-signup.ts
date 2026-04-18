import { createClient } from '@insforge/sdk';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
});

async function run() {
  const email = `test_user_${Date.now()}@test.com`;
  console.log('Testing signup with', email);
  const { data, error } = await insforge.auth.signUp({
    email,
    password: 'password123',
    name: 'Test Agent User',
  });
  
  if (error) {
    console.error('Error during signup:', error.message);
  } else {
    console.log('Signup result:', data);
  }
}

run();
