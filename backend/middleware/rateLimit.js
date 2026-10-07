// Minimal in-memory rate limiter (standalone port of express-rate-limit usage).
const rateLimit = ({ windowMs, max, message }) => {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();
  return (req, res, next) => {
    const key = req.ip || "anon";
    const n = (hits.get(key) || 0) + 1;
    hits.set(key, n);
    if (n > max) {
      return res
        .status(429)
        .json({ success: false, message: message || "Too many requests" });
    }
    next();
  };
};

// Assistant turns are the expensive endpoint — keep it tighter than general API.
const assistantLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many assistant messages — slow down a little.",
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many auth attempts. Try again later.",
});

module.exports = { rateLimit, assistantLimiter, authLimiter };
