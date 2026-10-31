import {defineConfig} from 'vitest/config';
export default defineConfig({test:{environment:'node',setupFiles:['./tests/setup.js'],include:['tests/**/*.test.js'],maxWorkers:2,testTimeout:30000,hookTimeout:60000}});
