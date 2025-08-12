/**
 * Simple test runner for Vortex Math Trading System
 * Runs all test files and reports results
 */

const fs = require('fs');
const path = require('path');

// Simple test framework
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    describe(description, testFn) {
        console.log(`\n📊 ${description}`);
        console.log('=' .repeat(50));
        testFn();
    }

    it(description, testFn) {
        try {
            testFn();
            this.passed++;
            console.log(`✅ ${description}`);
        } catch (error) {
            this.failed++;
            console.log(`❌ ${description}`);
            console.log(`   Error: ${error.message}`);
        }
    }

    expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${expected}, but got ${actual}`);
                }
            },
            toEqual: (expected) => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
                }
            },
            toBeCloseTo: (expected, precision = 2) => {
                const diff = Math.abs(actual - expected);
                const threshold = Math.pow(10, -precision);
                if (diff > threshold) {
                    throw new Error(`Expected ${actual} to be close to ${expected} within ${precision} decimal places`);
                }
            },
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected ${actual} to be truthy`);
                }
            },
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected ${actual} to be falsy`);
                }
            }
        };
    }

    run() {
        console.log('🌀 Vortex Math Trading System - Test Suite');
        console.log('==========================================\n');

        // Run all test files
        const testFiles = this.findTestFiles();
        
        for (const testFile of testFiles) {
            try {
                require(testFile);
            } catch (error) {
                console.log(`❌ Error loading test file ${testFile}: ${error.message}`);
                this.failed++;
            }
        }

        // Report results
        console.log('\n' + '=' .repeat(50));
        console.log('📊 Test Results Summary');
        console.log('=' .repeat(50));
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`📊 Total: ${this.passed + this.failed}`);
        
        if (this.failed === 0) {
            console.log('\n🎉 All tests passed!');
            process.exit(0);
        } else {
            console.log('\n💥 Some tests failed.');
            process.exit(1);
        }
    }

    findTestFiles() {
        const testDir = __dirname;
        const files = fs.readdirSync(testDir);
        return files
            .filter(file => file.endsWith('.test.js'))
            .map(file => path.join(testDir, file));
    }
}

// Create global test runner instance
global.testRunner = new TestRunner();
global.describe = global.testRunner.describe.bind(global.testRunner);
global.it = global.testRunner.it.bind(global.testRunner);
global.expect = global.testRunner.expect.bind(global.testRunner);

// Run tests if this file is executed directly
if (require.main === module) {
    global.testRunner.run();
}

module.exports = TestRunner;