// Test script to verify reconnect timing logic
// This demonstrates the timing behavior without running the actual WebSocket code

function calculateReconnectDelay(attemptNumber) {
    if (attemptNumber <= 12) {
        // First 2 minutes: fixed 10-second intervals
        return 10000; // 10 seconds
    } else {
        // After 2 minutes: exponential backoff
        const backoffAttempts = attemptNumber - 12;
        let delay = 10000 * Math.pow(2, backoffAttempts); // Start at 20s, then 40s, 80s, etc.
        delay = Math.min(delay, 300000); // Cap at 5 minutes
        return delay;
    }
}

console.log('Reconnect Timing Test:');
console.log('=======================');

let totalTime = 0;
for (let i = 1; i <= 30; i++) {
    const delay = calculateReconnectDelay(i);
    totalTime += delay;

    const delaySeconds = delay / 1000;
    const totalMinutes = Math.floor(totalTime / 60000);
    const totalSeconds = Math.floor((totalTime % 60000) / 1000);

    console.log(`Attempt ${i.toString().padStart(2)}: ${delaySeconds.toString().padStart(3)}s delay | Total time: ${totalMinutes}m ${totalSeconds}s`);

    if (i === 12) {
        console.log('--- Switching to exponential backoff ---');
    }
}

console.log('\nTiming verification:');
console.log(`First 12 attempts (2 minutes): ${12 * 10}s = ${12 * 10 / 60} minutes`);
console.log(`Attempts 13-15: 20s, 40s, 80s (1min 40s)`);
console.log(`Attempts 16-20: 160s, 320s, 640s, 1280s, 2560s (44min 40s)`);
console.log(`Attempts 21-30: capped at 300s each (50 minutes)`);
