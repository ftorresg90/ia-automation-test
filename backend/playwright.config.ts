import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './',
    testMatch: '**/*.spec.ts',
    testIgnore: ['tests/**', 'node_modules/**'],
    use: {
        video: 'on',
        screenshot: 'on',
        trace: 'retain-on-failure',
    },
});
