#!/usr/bin/env node

/**
 * Test Runner Script
 *
 * This script helps run tests with proper setup and teardown
 */

const { spawn } = require('child_process');
const path = require('path');

const clientDir = path.join(__dirname);
const serverDir = path.join(__dirname, '..', 'server');

function startServer() {
  console.log('🚀 Starting server...');

  return new Promise((resolve, reject) => {
    const server = spawn('bun', ['run', 'dev'], {
      cwd: serverDir,
      stdio: ['inherit', 'inherit', 'inherit']
    });

    // Wait for server to be ready
    let ready = false;
    const timeout = setTimeout(() => {
      if (!ready) {
        console.error('❌ Server failed to start within 30 seconds');
        server.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 30000);

    // Simple health check
    const checkServer = () => {
      if (ready) return;

      fetch('http://localhost:3000/')
        .then(() => {
          clearTimeout(timeout);
          ready = true;
          console.log('✅ Server is ready!');
          resolve(server);
        })
        .catch(() => {
          setTimeout(checkServer, 1000);
        });
    };

    setTimeout(checkServer, 2000);

    server.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function runTests(server) {
  console.log('🧪 Running browser tests...');

  return new Promise((resolve, reject) => {
    const testProcess = spawn('npm', ['run', 'test'], {
      cwd: clientDir,
      stdio: 'inherit'
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Tests passed!');
        resolve();
      } else {
        console.error(`❌ Tests failed with exit code ${code}`);
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });

    testProcess.on('error', reject);
  });
}

async function main() {
  let server = null;

  try {
    // Start server
    server = await startServer();

    // Run tests
    await runTests(server);

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('💥 Test run failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    if (server) {
      console.log('🛑 Stopping server...');
      server.kill();
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { startServer, runTests };
