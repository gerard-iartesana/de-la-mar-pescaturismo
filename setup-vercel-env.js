// Setup Vercel environment variables for Pescaturismo
// Run: node setup-vercel-env.js

const { execSync } = require('child_process');

const envVars = {
  REDSYS_SECRET_KEY: 'sq7HjrUOBfKmC576ILgskD5srU870gJ7',
  REDSYS_MERCHANT_CODE: '369386099',
  REDSYS_TERMINAL: '1',
  REDSYS_ENV: 'test',
  SUPABASE_URL: 'https://dazootyjaeqhgccpnbta.supabase.co',
  SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhem9vdHlqYWVxaGdjY3BuYnRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIyNzc5OCwiZXhwIjoyMDk5ODAzNzk4fQ.6-z8iPga6dmzdyHbmEBg4p5H8J94XJisDJ2UeJLc-Ts'
};

for (const [key, value] of Object.entries(envVars)) {
  console.log(`Setting ${key}...`);
  try {
    execSync(`echo ${value} | npx -y vercel env add ${key} production --force`, {
      stdio: 'pipe',
      env: { ...process.env, NODE_OPTIONS: '--use-system-ca' }
    });
    console.log(`  ✓ ${key} set`);
  } catch (err) {
    // Try alternative method
    try {
      execSync(`npx -y vercel env add ${key} production --force`, {
        input: value + '\n',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_OPTIONS: '--use-system-ca' }
      });
      console.log(`  ✓ ${key} set (alt method)`);
    } catch (err2) {
      console.log(`  ✗ ${key} failed: ${err2.message}`);
    }
  }
}

console.log('\nDone! Deploy with: vercel --prod');
