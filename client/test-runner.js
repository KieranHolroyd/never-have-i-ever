#!/usr/bin/env node

/**
 * Test Runner Script
 *
 * This script helps run tests with proper setup and teardown
 * Now simplified since Playwright handles server startup automatically
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientDir = path.join(__dirname);

function runTests() {
	console.log('🧪 Running browser tests with Playwright...');
	console.log('📝 Note: Playwright will automatically start both client and server');

	return new Promise((resolve, reject) => {
		// Use local playwright binary
		const playwrightBin = path.join(clientDir, 'node_modules', '.bin', 'playwright');
		console.log('Using Playwright binary:', playwrightBin);
		const testProcess = spawn(playwrightBin, ['test'], {
			cwd: clientDir,
			stdio: 'inherit'
		});

		testProcess.on('close', (code) => {
			if (code === 0) {
				console.log('✅ All tests passed!');
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
	try {
		await runTests();
		console.log('🎉 Test run completed successfully!');
	} catch (error) {
		console.error('💥 Test run failed:', error.message);
		process.exit(1);
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

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}

export { runTests };
