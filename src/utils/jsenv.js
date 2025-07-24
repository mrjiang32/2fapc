/**
 * @fileoverview JSON 配置文件读写工具
 * @description 提供同步和异步的 JSON 配置文件读写功能，支持自动创建目录和默认配置
 * @author Your Name
 * @version 1.0.0
 */

import fs from "fs";
import path from "path";
import log_sys from "./logmy.js";
import chalk from "chalk";

const logger = log_sys.get_logger("JS.ENV");

/**
 * 从 JSON 文件中读取配置。如果文件不存在，则尝试创建它。
 * @param {string} file_path - JSON 文件的路径（相对或绝对路径）
 * @param {string} [key] - 要读取的特定键 (可选)。如果未提供，则返回整个 JSON 对象
 * @param {object} [default_config={}] - 默认配置对象，用于创建文件（可选）
 * @param {boolean} [create_dir=true] - 是否自动创建目录（可选，默认为 true）
 * @returns {any|null} 如果提供了键，则返回键对应的值。否则返回整个 JSON 对象。如果文件不存在或发生错误，则返回 null
 * @throws {Error} 当 JSON 解析失败时抛出错误
 * @example
 * // 读取整个配置文件
 * const config = read_config('./config.json');
 * 
 * // 读取特定键值
 * const dbUrl = read_config('./config.json', 'database_url');
 * 
 * // 提供默认配置
 * const config = read_config('./config.json', null, { port: 3000 });
 */
function read_config(file_path, key, default_config = {}, create_dir = true) {
    try {
        const abs_path = path.resolve(file_path);
        
        if (!fs.existsSync(abs_path)) {
            logger.warn(`配置文件未找到: ${chalk.yellow(abs_path)}, 尝试创建默认配置`);
            
            if (create_dir) {
                const dir = path.dirname(abs_path);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                    logger.log(`目录已创建: ${chalk.yellow(dir)}`);
                }
            }
            
            if (!write_config(file_path, default_config)) {
                logger.error(`创建默认文件失败: ${chalk.yellow(abs_path)}`);
                return null;
            }
            logger.log(`默认文件已创建: ${chalk.yellow(abs_path)}`);
        }
        
        const data = fs.readFileSync(abs_path, 'utf8');
        const config = JSON.parse(data);
        return key ? (config[key] ?? null) : config;
    } catch (error) {
        logger.error(`读取配置失败: ${chalk.red(error.message)}`);
        return null;
    }
}

/**
 * 将配置写入 JSON 文件。
 * @param {string} file_path - JSON 文件的路径（相对或绝对路径）
 * @param {object|any} config - 要写入的配置对象或任何可序列化的数据
 * @param {boolean} [pretty=true] - 是否格式化 JSON 输出 (可选，默认为 true)
 * @param {boolean} [create_dir=true] - 是否自动创建目录（可选，默认为 true）
 * @returns {boolean} 如果成功写入，则返回 true，否则返回 false
 * @throws {Error} 当文件写入失败时抛出错误
 * @example
 * // 写入配置对象
 * const success = write_config('./config.json', { port: 3000, debug: true });
 * 
 * // 写入压缩格式的 JSON
 * const success = write_config('./config.json', config, false);
 * 
 * // 不自动创建目录
 * const success = write_config('./existing/config.json', config, true, false);
 */
function write_config(file_path, config, pretty = true, create_dir = true) {
    try {
        const abs_path = path.resolve(file_path);
        
        if (create_dir) {
            const dir = path.dirname(abs_path);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                logger.log(`目录已创建: ${chalk.yellow(dir)}`);
            }
        }
        
        const json = pretty ? JSON.stringify(config, null, 2) : JSON.stringify(config);
        fs.writeFileSync(abs_path, json, 'utf8');
        return true;
    } catch (error) {
        logger.error(`写入配置失败: ${chalk.red(error.message)}`);
        return false;
    }
}

/**
 * 异步读取配置文件
 * @async
 * @param {string} file_path - 文件路径（相对或绝对路径）
 * @param {string} [key] - 可选键名，如果提供则只返回该键的值
 * @param {object} [default_config={}] - 默认配置对象，文件不存在时使用
 * @param {boolean} [create_dir=true] - 是否自动创建目录
 * @returns {Promise<any|null>} 返回 Promise，解析为配置数据或 null（出错时）
 * @throws {Error} 当文件读取或 JSON 解析失败时抛出错误
 * @example
 * // 异步读取整个配置文件
 * const config = await read_config_async('./config.json');
 * 
 * // 异步读取特定键值
 * const dbUrl = await read_config_async('./config.json', 'database_url');
 * 
 * // 使用默认配置
 * const config = await read_config_async('./config.json', null, { port: 3000 });
 */
async function read_config_async(file_path, key, default_config = {}, create_dir = true) {
    try {
        const abs_path = path.resolve(file_path);
        
        try {
            await fs.promises.access(abs_path);
        } catch {
            logger.warn(`配置文件未找到: ${chalk.yellow(abs_path)}, 尝试创建默认配置`);
            
            if (create_dir) {
                const dir = path.dirname(abs_path);
                try {
                    await fs.promises.mkdir(dir, { recursive: true });
                    logger.log(`目录已创建: ${chalk.yellow(dir)}`);
                } catch (err) {
                    logger.error(`创建目录失败: ${chalk.red(err.message)}`);
                }
            }
            
            if (!await write_config_async(file_path, default_config)) {
                logger.error(`创建默认文件失败: ${chalk.yellow(abs_path)}`);
                return null;
            }
            logger.log(`默认文件已创建: ${chalk.yellow(abs_path)}`);
        }
        
        const data = await fs.promises.readFile(abs_path, 'utf8');
        const config = JSON.parse(data);
        return key ? (config[key] ?? null) : config;
    } catch (error) {
        logger.error(`异步读取配置失败: ${chalk.red(error.message)}`);
        return null;
    }
}

/**
 * 异步写入配置文件
 * @async
 * @param {string} file_path - 文件路径（相对或绝对路径）
 * @param {object|any} config - 配置对象或任何可序列化的数据
 * @param {boolean} [pretty=true] - 是否美化输出（格式化 JSON）
 * @param {boolean} [create_dir=true] - 是否自动创建目录
 * @returns {Promise<boolean>} 返回 Promise，解析为 true（成功）或 false（失败）
 * @throws {Error} 当文件写入失败时抛出错误
 * @example
 * // 异步写入配置对象
 * const success = await write_config_async('./config.json', { port: 3000 });
 * 
 * // 异步写入压缩格式的 JSON
 * const success = await write_config_async('./config.json', config, false);
 * 
 * // 不自动创建目录
 * const success = await write_config_async('./existing/config.json', config, true, false);
 */
async function write_config_async(file_path, config, pretty = true, create_dir = true) {
    try {
        const abs_path = path.resolve(file_path);
        
        if (create_dir) {
            const dir = path.dirname(abs_path);
            try {
                await fs.promises.mkdir(dir, { recursive: true });
                logger.log(`目录已创建: ${chalk.yellow(dir)}`);
            } catch (err) {
                if (err.code !== 'EEXIST') {
                    logger.error(`创建目录失败: ${chalk.red(err.message)}`);
                    return false;
                }
            }
        }
        
        const json = pretty ? JSON.stringify(config, null, 2) : JSON.stringify(config);
        await fs.promises.writeFile(abs_path, json, 'utf8');
        return true;
    } catch (error) {
        logger.error(`异步写入配置失败: ${chalk.red(error.message)}`);
        return false;
    }
}

/**
 * 导出的配置文件操作模块
 * @namespace JSEnv
 * @description 提供同步和异步的 JSON 配置文件读写功能
 * @property {Function} read_config - 同步读取配置文件
 * @property {Function} write_config - 同步写入配置文件
 * @property {Function} read_config_async - 异步读取配置文件
 * @property {Function} write_config_async - 异步写入配置文件
 * @example
 * import jsenv from './jsenv.js';
 * 
 * // 同步操作
 * const config = jsenv.read_config('./config.json');
 * jsenv.write_config('./config.json', { port: 3000 });
 * 
 * // 异步操作
 * const config = await jsenv.read_config_async('./config.json');
 * await jsenv.write_config_async('./config.json', { port: 3000 });
 */
export default Object.freeze({
    read_config,
    write_config,
    read_config_async,
    write_config_async
});