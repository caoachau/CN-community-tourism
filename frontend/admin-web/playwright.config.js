import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./e2e',timeout:180000,workers:1,fullyParallel:false,retries:0,reporter:'list',
  globalTeardown:'./e2e/teardown.js',
  use:{baseURL:'http://127.0.0.1:5177',channel:'chrome',headless:true,actionTimeout:15000,screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:[
    {command:'node ../../backend/test/support/ui-server.js',url:'http://127.0.0.1:5005/api/health',timeout:180000,reuseExistingServer:false,
      env:{NODE_ENV:'test',TEST_DATABASE_URL:process.env.TEST_DATABASE_URL??'mysql://ctp_test:ctp_local_test_only@127.0.0.1:3307/ctp_test_control'}},
    {command:'npm run dev -- --host 127.0.0.1 --port 5177 --strictPort',url:'http://127.0.0.1:5177',timeout:30000,reuseExistingServer:false,env:{DEV_API_TARGET:'http://127.0.0.1:5005',VITE_API_BASE_URL:'/api/v1'}},
  ],
});
