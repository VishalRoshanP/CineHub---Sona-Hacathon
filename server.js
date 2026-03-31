// Caching removed to:
// 1. Reduce memory usage
// 2. Avoid stale data
// 3. Ensure consistency
// 4. Support free-tier deployment (512MB MongoDB Atlas)

import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./utils/db.js";
import movieRoutes from "./routes/movie.routes.js";
import favoriteRoutes from "./routes/favorite.routes.js";
import { chatHandler } from "./controller/chat.controller.js";
import errorHandler from "./error-handling/errorHandler.js";
import logger from "./utils/logger.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

//testgit 

// ── Request & Response Logging Middleware ───────────────
// Uses res.on('finish') so it never conflicts with route handlers.
app.use((req, res, next) => {
    // Log the incoming request
    logger.request(req);

    // Capture start time for duration calculation
    const startTime = Date.now();

    // Capture response body without breaking the res.json chain.
    // We store the body on a private Symbol so no other middleware collides.
    const _bodyKey = Symbol("logBody");
    const _origJson = res.json.bind(res);
    res.json = function logCapture(body) {
        res[_bodyKey] = body;
        // Restore original immediately so downstream patches work cleanly
        res.json = _origJson;
        return res.json(body);
    };

    // Log once the response is fully sent (works for ALL responses)
    res.on("finish", () => {
        const duration = Date.now() - startTime;
        logger.response(req, res.statusCode, res[_bodyKey], duration);
    });

    next();
});

// ── No cache layers — all requests go directly to MongoDB ──
// Previous L2 (memory), L3 (edge/CDN headers), and L4 (Redis) caching
// layers have been removed for stateless, low-memory operation.

// Routes
app.use("/api/movies", movieRoutes);
app.use("/api/favorites", favoriteRoutes);

// Chatbot route
app.post("/api/chat", chatHandler);

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "direct-db", cache: "disabled" });
});

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
    console.log("");
    console.log("🚀 CineHub Backend Started Successfully");
    console.log("⚡ Cache system disabled for low-memory deployment");
    console.log("🗄️  Running in direct DB mode");
    console.log("☁️  Optimized for MongoDB Atlas Free Tier (512MB)");

    // 1. Connect MongoDB
    await connectDB();

    // 2. Logging status
    const logEnabled = process.env.LOG_ENABLED !== "false";
    console.log(logEnabled ? "📋 Demo Logging Enabled" : "📋 Demo Logging Disabled");

    // 3. Start listening
    app.listen(PORT, () => {
        console.log(`🌐 Server running at http://localhost:${PORT}`);
        console.log("");
    });
};

startServer();
