#!/usr/bin/env node

// SIKESRA Performance Testing Script
// Validates worker performance under realistic load
// Source: Issue #199
//
// Usage:
//   node scripts/performance-test.mjs [base_url]
//   base_url defaults to http://localhost:4321

import { performance } from "node:perf_hooks";

const BASE_URL = process.argv[2] || "http://localhost:4321";
const REQUEST_TIMEOUT = 30000;
const CONCURRENCY = 5;

// Test configuration
const TEST_CONFIG = {
  entityList: { iterations: 50, concurrency: CONCURRENCY },
  dashboard: { iterations: 20, concurrency: 2 },
  verificationQueue: { iterations: 20, concurrency: 2 },
  auditList: { iterations: 20, concurrency: 2 },
  publicSummary: { iterations: 30, concurrency: 3 },
};

// Performance targets (milliseconds)
const TARGETS = {
  p50: 200,
  p95: 500,
  p99: 1000,
  errorRate: 0.01, // 1%
};

// Results storage
const results = {};

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function makeRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  const start = performance.now();
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const duration = performance.now() - start;
    clearTimeout(timeoutId);

    return {
      status: response.status,
      duration,
      ok: response.ok,
    };
  } catch (error) {
    const duration = performance.now() - start;
    clearTimeout(timeoutId);
    return {
      status: 0,
      duration,
      ok: false,
      error: error.message,
    };
  }
}

async function runConcurrentRequests(url, iterations, concurrency) {
  const durations = [];
  const errors = [];
  let successCount = 0;

  for (let i = 0; i < iterations; i += concurrency) {
    const batch = [];
    for (let j = 0; j < Math.min(concurrency, iterations - i); j++) {
      batch.push(makeRequest(url));
    }
    const batchResults = await Promise.all(batch);

    for (const result of batchResults) {
      durations.push(result.duration);
      if (result.ok) {
        successCount++;
      } else {
        errors.push(result.error || `HTTP ${result.status}`);
      }
    }
  }

  durations.sort((a, b) => a - b);

  return {
    total: durations.length,
    success: successCount,
    errors: errors.length,
    errorRate: errors.length / durations.length,
    p50: durations[Math.floor(durations.length * 0.5)] || 0,
    p95: durations[Math.floor(durations.length * 0.95)] || 0,
    p99: durations[Math.floor(durations.length * 0.99)] || 0,
    min: durations[0] || 0,
    max: durations[durations.length - 1] || 0,
    avg: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
  };
}

async function testEndpoint(name, path, config) {
  log(`Testing ${name}...`);
  const url = `${BASE_URL}${path}`;
  const result = await runConcurrentRequests(url, config.iterations, config.concurrency);
  results[name] = result;

  const status = result.errorRate <= TARGETS.errorRate && result.p95 <= TARGETS.p95 ? "✅ PASS" : "⚠️ FAIL";
  log(`  ${status} - ${result.total} requests, ${result.success} success, ${result.errors} errors`);
  log(`  p50: ${result.p50.toFixed(1)}ms, p95: ${result.p95.toFixed(1)}ms, p99: ${result.p99.toFixed(1)}ms`);
  log(`  avg: ${result.avg.toFixed(1)}ms, min: ${result.min.toFixed(1)}ms, max: ${result.max.toFixed(1)}ms`);

  return result;
}

async function runAllTests() {
  log(`Starting performance tests against ${BASE_URL}`);
  log(`Targets: p50 < ${TARGETS.p50}ms, p95 < ${TARGETS.p95}ms, p99 < ${TARGETS.p99}ms, error rate < ${(TARGETS.errorRate * 100).toFixed(0)}%`);
  log("");

  // Test public summary (no auth required)
  await testEndpoint("Public Summary", "/_emdash/api/plugins/sikesra/public/summary", TEST_CONFIG.publicSummary);

  // Test admin endpoints (may require auth - will show as errors if not authenticated)
  await testEndpoint("Entity List", "/_emdash/api/plugins/sikesra/v1/entities", TEST_CONFIG.entityList);
  await testEndpoint("Dashboard", "/_emdash/api/plugins/sikesra/dashboard", TEST_CONFIG.dashboard);
  await testEndpoint("Verification Queue", "/_emdash/api/plugins/sikesra/v1/verification/queue", TEST_CONFIG.verificationQueue);
  await testEndpoint("Audit List", "/_emdash/api/plugins/sikesra/v1/audit", TEST_CONFIG.auditList);

  log("");
  log("=== Performance Test Summary ===");

  let passCount = 0;
  let failCount = 0;

  for (const [name, result] of Object.entries(results)) {
    const passed = result.errorRate <= TARGETS.errorRate && result.p95 <= TARGETS.p95;
    if (passed) passCount++;
    else failCount++;

    log(`${passed ? "✅" : "⚠️"} ${name}: p50=${result.p50.toFixed(0)}ms, p95=${result.p95.toFixed(0)}ms, errors=${result.errorRate.toFixed(2)}`);
  }

  log("");
  log(`Results: ${passCount} passed, ${failCount} failed out of ${Object.keys(results).length} tests`);

  if (failCount > 0) {
    log("\n⚠️ Performance targets not met. Review bottlenecks before production scaling.");
    process.exit(1);
  } else {
    log("\n✅ All performance targets met.");
    process.exit(0);
  }
}

runAllTests().catch((error) => {
  log(`Fatal error: ${error.message}`);
  process.exit(1);
});
