import { verify } from "jsonwebtoken";
const { isAdmin } = require("../../../lib/driver-mapping");
const { clearCache, getCacheStats } = require("../../../lib/spoke-api");

function requireAuth(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/soda_session=([^;]+)/);
  if (!match) return null;
  try {
    return verify(match[1], process.env.JWT_SECRET || "dev-secret");
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  const session = requireAuth(req);
  if (!session) return res.status(401).json({ error: "not authenticated" });

  // Check if user is admin
  if (!isAdmin(session.username)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  if (req.method === "GET") {
    // GET: Return cache statistics
    const stats = getCacheStats();
    return res.json({
      message: "Cache statistics",
      stats,
      cacheDuration: "1 hour",
    });
  }

  if (req.method === "POST" || req.method === "DELETE") {
    // POST/DELETE: Clear cache
    const { type } = req.query;

    try {
      if (type && ["plans", "routes", "stops", "driverHours"].includes(type)) {
        clearCache(type);
        return res.json({
          message: `Cache cleared for: ${type}`,
          stats: getCacheStats(),
        });
      } else {
        clearCache();
        return res.json({
          message: "All caches cleared",
          stats: getCacheStats(),
        });
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
      return res.status(500).json({ error: "Failed to clear cache" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
