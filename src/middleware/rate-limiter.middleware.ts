import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
});
