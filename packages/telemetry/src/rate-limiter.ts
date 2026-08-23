export interface RateLimitResult {
  isAllowed: boolean;
  limit: number;
  remaining: number;
  resetTimeMs: number;
}

export class SlidingWindowRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private requests: Map<string, number[]> = new Map();

  constructor(windowMs: number = 60000, maxRequests: number = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  public check(clientId: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.requests.get(clientId) || [];
    // Filter out timestamps older than the sliding window
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      const oldestInWindow = timestamps[0];
      const resetTimeMs = oldestInWindow + this.windowMs - now;
      return {
        isAllowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetTimeMs: Math.max(0, resetTimeMs),
      };
    }

    timestamps.push(now);
    this.requests.set(clientId, timestamps);

    return {
      isAllowed: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - timestamps.length,
      resetTimeMs: this.windowMs,
    };
  }

  public reset(clientId?: string): void {
    if (clientId) {
      this.requests.delete(clientId);
    } else {
      this.requests.clear();
    }
  }
}

export const rateLimiter = new SlidingWindowRateLimiter(60000, 60);
