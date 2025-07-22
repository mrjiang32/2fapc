import fs from "fs";
import path from "path";
import log_sys from "./logmy.js";
import chalk from "chalk";

const logger = log_sys.get_logger("JS.ENV");

/**
 * 从 JSON 文件中读取配置。如果文件不存在，则尝试创建它。
 * @param {string} file_path - JSON 文件的路径。
 * @param {string} [key] - 要读取的特定键 (可选)。如果未提供，则返回整个 JSON 对象。
 * @param {object} [default_config={}] - 默认配置对象，用于创建文件（可选）。
 * @param {boolean} [create_dir=true] - 是否自动创建目录（可选，默认为 true）。
 * @returns {any} - 如果提供了键，则返回键对应的值。否则返回整个 JSON 对象。如果文件不存在或发生错误，则返回 null。
 */
function read_config(file_path, key, default_config = {}, create_dir = true) {
    try {
        const abs_path = path.resolve(file_path);
        
        if (!fs.existsSync(abs_path)) {
            logger.warn(`Config file Not Found: ${chalk.yellow(abs_path)}, trying creating default.`);
            
            if (create_dir) {
                const dir = path.dirname(abs_path);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                    logger.log(`Directory created: ${chalk.yellow(dir)}`);
                }
            }
            
            if (!write_config(file_path, default_config)) {
                logger.error(`Create default file ${chalk.yellow(abs_path)} failed!`);
                return null;
            }
            logger.log(`Default file ${chalk.yellow(abs_path)} created!`);
        }
        
        const data = fs.readFileSync(abs_path, 'utf8');
        const config = JSON.parse(data);
        return key ? (config[key] ?? null) : config;
    } catch (error) {
        logger.error(`Read config failed: ${chalk.red(error.message)}`);
        return null;
    }
}

/**
 * 将配置写入 JSON 文件。
 * @param {string} file_path - JSON 文件的路径。
 * @param {object} config - 要写入的配置对象。
 * @param {boolean} [pretty=true] - 是否格式化 JSON 输出 (可选，默认为 true)。
 * @param {boolean} [create_dir=true] - 是否自动创建目录（可选，默认为 true）。
 * @returns {boolean} - 如果成功写入，则返回 true，否则返回 false。
 */
function write_config(file_path, config, pretty = true, create_dir = true) {
    try {
        const abs_path = path.resolve(file_path);
        
        if (create_dir) {
            const dir = path.dirname(abs_path);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                logger.log(`Directory created: ${chalk.yellow(dir)}`);
            }
        }
        
        const json = pretty ? JSON.stringify(config, null, 2) : JSON.stringify(config);
        fs.writeFileSync(abs_path, json, 'utf8');
        return true;
    } catch (error) {
        logger.error(`Write config failed: ${chalk.red(error.message)}`);
        return false;
    }
}

/**
 * 异步读取配置文件
 * @param {string} file_path - 文件路径
 * @param {string} [key] - 可选键名
 * @param {object} [default_config={}] - 默认配置
 * @param {boolean} [create_dir=true] - 是否创建目录
 * @returns {Promise<any>} - 返回Promise
 */
async function read_config_async(file_path, key, default_config = {}, create_dir = true) {
    try {
        const abs_path = path.resolve(file_path);
        
        try {
            await fs.promises.access(abs_path);
        } catch {
            logger.warn(`Config file Not Found: ${chalk.yellow(abs_path)}, trying creating default.`);
            
            if (create_dir) {
                const dir = path.dirname(abs_path);
                try {
                    await fs.promises.mkdir(dir, { recursive: true });
                    logger.log(`Directory created: ${chalk.yellow(dir)}`);
                } catch (err) {
                    logger.error(`Create directory failed: ${chalk.red(err.message)}`);
                }
            }
            
            if (!await write_config_async(file_path, default_config)) {
                logger.error(`Create default file ${chalk.yellow(abs_path)} failed!`);
                return null;
            }
            logger.log(`Default file ${chalk.yellow(abs_path)} created!`);
        }
        
        const data = await fs.promises.readFile(abs_path, 'utf8');
        const config = JSON.parse(data);
        return key ? (config[key] ?? null) : config;
    } catch (error) {
        logger.error(`Async read config failed: ${chalk.red(error.message)}`);
        return null;
    }
}

/**
 * 异步写入配置文件
 * @param {string} file_path - 文件路径
 * @param {object} config - 配置对象
 * @param {boolean} [pretty=true] - 是否美化输出
 * @param {boolean} [create_dir=true] - 是否创建目录
 * @returns {Promise<boolean>} - 返回Promise
 */
async function write_config_async(file_path, config, pretty = true, create_dir = true) {
    try {
        const abs_path = path.resolve(file_path);
        
        if (create_dir) {
            const dir = path.dirname(abs_path);
            try {
                await fs.promises.mkdir(dir, { recursive: true });
                logger.log(`Directory created: ${chalk.yellow(dir)}`);
            } catch (err) {
                if (err.code !== 'EEXIST') {
                    logger.error(`Create directory failed: ${chalk.red(err.message)}`);
                    return false;
                }
            }
        }
        
        const json = pretty ? JSON.stringify(config, null, 2) : JSON.stringify(config);
        await fs.promises.writeFile(abs_path, json, 'utf8');
        return true;
    } catch (error) {
        logger.error(`Async write config failed: ${chalk.red(error.message)}`);
        return false;
    }
}

export default Object.freeze({
    read_config,
    write_config,
    read_config_async,
    write_config_async
});