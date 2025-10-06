#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting all services...\n');

// Function to start a service
function startService(name, command, args, cwd, env = {}) {
  console.log(`📱 Starting ${name}...`);
  
  const child = spawn(command, args, {
    cwd: cwd || process.cwd(),
    env: { ...process.env, ...env },
    stdio: 'pipe',
    shell: true
  });

  child.stdout.on('data', (data) => {
    console.log(`[${name}] ${data.toString().trim()}`);
  });

  child.stderr.on('data', (data) => {
    console.error(`[${name} ERROR] ${data.toString().trim()}`);
  });

  child.on('close', (code) => {
    console.log(`[${name}] Process exited with code ${code}`);
  });

  return child;
}

// Start Backend
const backend = startService('Backend', 'node', ['server.js'], path.join(process.cwd(), 'backend'));

// Wait a moment for backend to start
setTimeout(() => {
  // Start Customer App
  const customer = startService('Customer App', 'npm', ['start'], process.cwd(), {
    EXPO_PUBLIC_APP_VARIANT: 'customer'
  });

  // Wait a moment then start Worker App
  setTimeout(() => {
    const worker = startService('Worker App', 'npm', ['start'], process.cwd(), {
      EXPO_PUBLIC_APP_VARIANT: 'worker'
    });
  }, 2000);

}, 2000);

console.log('\n✅ All services are starting...');
console.log('📱 Customer App will be available on Expo Go');
console.log('👷 Worker App will be available on Expo Go');
console.log('🔧 Backend will be available on http://localhost:3000');
console.log('\nPress Ctrl+C to stop all services');
