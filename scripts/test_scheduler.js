const schedulerService = require('../services/schedulerService');

async function testScheduler() {
  console.log('=== Testing Scheduler Service ===\n');
  
  // Test 1: Get scheduler status
  console.log('1. Scheduler Status:');
  const status = schedulerService.getStatus();
  console.log(JSON.stringify(status, null, 2));
  console.log();
  
  // Test 2: Check if today would be considered last day of month
  console.log('2. Last Day Check:');
  console.log('Is today last day of month?', schedulerService.isLastDayOfMonth());
  console.log('Current date:', new Date().toLocaleDateString());
  console.log();
  
  // Test 3: Get next run time
  console.log('3. Next Run Time:');
  const nextRun = schedulerService.getNextRunTime();
  console.log('Next scheduled run:', nextRun.toLocaleString());
  console.log();
  
  // Test 4: Start scheduler (if not already running)
  console.log('4. Starting Scheduler:');
  if (!status.isRunning) {
    schedulerService.start();
    console.log('Scheduler started');
  } else {
    console.log('Scheduler already running');
  }
  
  // Show final status
  const finalStatus = schedulerService.getStatus();
  console.log('\nFinal Status:');
  console.log(`- Running: ${finalStatus.isRunning}`);
  console.log(`- Active Jobs: ${finalStatus.activeJobs.join(', ')}`);
  console.log(`- Next Run: ${finalStatus.nextRun.toLocaleString()}`);
  
  console.log('\n=== Test Complete ===');
  console.log('The scheduler is now running and will automatically generate');
  console.log('ARIMA forecasts on the last day of each month at 11:30 PM.');
  console.log('\nTo manually test forecasting, you can use:');
  console.log('POST /api/scheduler/trigger with { "year": 2025, "month": 11 }');
}

// Run the test
testScheduler().catch(console.error);