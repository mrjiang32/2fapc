import express from "express";
import path from "path";
import logmy from "../utils/logmy.js";
import health from "./health.js";
import chalk from "chalk";

import { fileURLToPath } from "url"; // 新增：解决 __dirname 问题

await logmy.init_logger();

const app = express();
const PORT = 32504;

// 修复 ESM 下的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const log = logmy.get_logger("Server");

app.use((req, res, next) => {
    res.on("finish", () => {
        log.info(`${req.method} ${req.originalUrl} - ${res.statusCode}`);
    });
    next();
});

app.use((req, res, next) => {
    if(req.path.startsWith("/api")) {
        log.info(`API Request: ${req.method} ${req.path}`);
        if (req.headers.authorization !== `Bearer ${config.token}`) {
            return res.status(401).json({ error: "Unauthorized" });
        }
    }
    next();
});

app.get("/apt/validate", (req, res) => {
    res.status(200).json({
        ok: true,
        message: "APT validation successful",
    });
});

// API 路由
app.get("/api/health", (req, res) => {
    res.status(health.is_healthy() ? 200 : 503).json({
        ok: true,
        healthy: health.is_healthy(),
        status: health.get_health(),
    });
});

// 生产环境静态文件服务
if (process.env.NODE_ENV === "production") {
    const staticPath = path.join(__dirname, "../../dist"); 
    app.use(express.static(staticPath));
    
    // 处理前端路由（如 React Router）
    app.get("*", (req, res) => {
        res.sendFile(path.join(staticPath, "index.html"));
    });
}

// 启动服务器
app.listen(PORT, () => {
    log.info(`Server is running on ${chalk.blue("http://127.0.0.1:" + PORT)}`);
});