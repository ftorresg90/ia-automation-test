import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: './',
    testMatch: ['<rootDir>/tests/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    verbose: true,
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
};

export default config;
