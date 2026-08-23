import { CacheManager } from './cache-manager';
import { SlidingWindowRateLimiter } from './rate-limiter';
import { MetricsCollector } from './metrics';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('🧪 Starting Phase 7 Telemetry & Caching Quality Test Suite...\n');

// 1. Multi-Level LRU Cache & Invalidation (CP-7.1)
console.log('--- CP-7.1: Multi-Level Cache Engine ---');

const cache = new CacheManager({ maxItems: 3, defaultTtlMs: 1000 });
cache.set('graph:analysis-1:arch', { nodes: 10 });
cache.set('graph:analysis-1:dep', { nodes: 15 });
cache.set('graph:analysis-2:arch', { nodes: 20 });

assert(cache.get('graph:analysis-1:arch') !== null, 'Retrieved active cache entry');
const stats1 = cache.getStats();
assert(stats1.hits === 1, `Recorded cache hit (hits: ${stats1.hits})`);

// Test LRU eviction when exceeding max capacity (3)
cache.set('routes:analysis-1', [{ path: '/orders' }]);
// Oldest item 'graph:analysis-1:dep' should have been evicted
assert(cache.get('graph:analysis-1:dep') === null, 'Oldest item evicted on capacity overflow');

// Test Pattern Invalidation
const invalidated = cache.invalidatePattern('graph:analysis-1:*');
assert(invalidated >= 1, `Invalidated ${invalidated} keys matching pattern`);
assert(cache.get('graph:analysis-1:arch') === null, 'Pattern-invalidated key no longer accessible');

// 2. Sliding Window Rate Limiter (CP-7.1)
console.log('\n--- CP-7.1: Sliding Window Rate Limiter ---');

const limiter = new SlidingWindowRateLimiter(5000, 3);
const client = 'ip-192.168.1.100';

const res1 = limiter.check(client);
assert(res1.isAllowed, 'First request allowed');
assert(res1.remaining === 2, '2 requests remaining');

const res2 = limiter.check(client);
assert(res2.isAllowed, 'Second request allowed');

const res3 = limiter.check(client);
assert(res3.isAllowed, 'Third request allowed (at limit)');
assert(res3.remaining === 0, '0 requests remaining');

const res4 = limiter.check(client);
assert(!res4.isAllowed, 'Fourth request blocked by rate limiter');
assert(res4.resetTimeMs > 0, `Reset time positive (${res4.resetTimeMs}ms)`);

// 3. OpenTelemetry Metrics & Diagnostics (CP-7.2)
console.log('\n--- CP-7.2: OpenTelemetry Metrics & Diagnostics ---');

const metrics = new MetricsCollector();
metrics.recordStageLatency('ingestion', 350);
metrics.recordStageLatency('parsing', 95);
metrics.recordStageLatency('graph', 45);
metrics.recordStageLatency('rag', 18);

const diag = metrics.getDiagnostics();
assert(diag.status === 'healthy', 'Health status is healthy');
assert(diag.memory.heapUsedMb > 0, `Recorded heap usage: ${diag.memory.heapUsedMb}MB`);
assert(diag.latencies.ragP95Ms > 0, `Calculated RAG p95 latency: ${diag.latencies.ragP95Ms}ms`);
assert(diag.latencies.graphP95Ms > 0, `Calculated Graph p95 latency: ${diag.latencies.graphP95Ms}ms`);

console.log('\n🎉 ALL PHASE 7 TELEMETRY & CACHING TESTS PASSED CLEANLY!\n');
