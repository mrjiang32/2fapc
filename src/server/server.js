import express from "express";
import path from "path";
import { fileURLToPath } from "url"; // 新增：解决 __dirname 问题
import health from "./health.js";
import logmy from "../utils/logmy.js";

const app = express();
const PORT = 32504;

// 修复 ESM 下的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化日志
await logmy.init_logger();
const log = logmy.get_logger("Server");

// API 路由
app.get("/api/health", (req, res) => {
    res.status(health.is_healthy() ? 200 : 503).json({
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
    log.info(`Server is running on port ${PORT}`);
});

export default app;