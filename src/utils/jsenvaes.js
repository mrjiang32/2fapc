/**
 * @fileoverview AES加密工具，用于安全配置管理
 * @description 提供AES-256-CBC加密/解密功能，使用PBKDF2密钥派生
 * 用于敏感配置数据的安全存储。
 */

import crypto from "crypto";
import chalk from "chalk";
import log_sys from "./logmy.js";
import jsenv from "./jsenv.js";

const logger = log_sys.get_logger("JS.ENV.CRYPTO");

/**
 * 加密配置常量
 * @type {Object}
 * @property {string} algorithm - AES加密算法
 * @property {number} iv_length - 初始化向量长度（字节）
 * @property {Object} pbkdf2 - PBKDF2密钥派生配置
 */
// 加密配置常量
const encryption_config = {
  algorithm: "aes-256-cbc",
  iv_length: 16,
  pbkdf2: {
    iterations: 100000,
    salt_length: 16,
    key_length: 32,
    digest: "sha256"
  }
};

/**
 * 生成用于密钥派生的随机盐值
 * @returns {string} 十六进制格式的盐值
 */
function generate_salt() {
  const salt = crypto.randomBytes(encryption_config.pbkdf2.salt_length);
  return salt.toString("hex");
}

/**
 * 使用PBKDF2从密码和盐值派生加密密钥
 * @param {string} password - 加密密码
 * @param {string} salt_hex - 十六进制盐值
 * @returns {Promise<Buffer>} 派生的加密密钥
 * @throws {Error} 如果盐值无效或密钥派生失败
 */
async function derive_key(password, salt_hex) {
  try {
    if (!salt_hex || typeof salt_hex !== "string") {
      throw new Error("Invalid salt value: must be a non-empty string");
    }

    const salt = Buffer.from(salt_hex, "hex");
    logger.log(`${chalk.blue("Deriving key")} (iterations: ${chalk.yellow(encryption_config.pbkdf2.iterations)})...`);

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        encryption_config.pbkdf2.iterations,
        encryption_config.pbkdf2.key_length,
        encryption_config.pbkdf2.digest,
        (err, derived_key) => {
          if (err) {
            logger.error(`${chalk.red("Key derivation failed:")} ${err.message}`);
            reject(err);
          } else {
            logger.log(`${chalk.green("✓")} Key derivation successful`);
            resolve(derived_key);
          }
        }
      );
    });
  } catch (error) {
    logger.error(`${chalk.red("Error during key derivation process:")} ${error.message}`);
    throw error;
  }
}

/**
 * 初始化加密环境并管理密钥文件
 * @param {string} key_file_path - 加密密钥文件路径
 * @param {string} password - 加密密码
 * @returns {Promise<Buffer>} 加密密钥
 * @throws {Error} 如果初始化失败或密钥文件无效
 */
async function init_encryption(key_file_path, password) {
  try {
    const salt = generate_salt();
    const key = await derive_key(password, salt);
    const start = Date.now();

    // 尝试读取密钥文件
    let key_info = {
      algorithm: encryption_config.algorithm,
      salt: salt,
      created_at: start
    };

    key_info = await jsenv.read_config_async(key_file_path, undefined, key_info);

    if (start === key_info.created_at) {
      write_encrypted_config(".validate", { valid: true }, key);
      return key; // 如果密钥文件是新创建的，直接返回新密钥
    }

    const ndkey = await derive_key(password, key_info.salt);

    // 旧建的密钥文件
    const validate = await read_encrypted_config(".validate", ndkey);
    if (!validate || !validate.valid) {
      throw new Error("Password is invalid or the `.validate` file is missing.");
    }

    // 验证密钥文件内容
    if (!key_info.salt || typeof key_info.salt !== "string") {
      throw new Error("Invalid key file format: missing valid salt value");
    }

    // 从现有密钥文件派生密钥
    return ndkey;
  } catch (error) {
    logger.error(`${chalk.red("Failed to initialize:")} ${error.message}. Please check your key file and password.`);
    throw error;
  }
}

/**
 * 使用AES-256-CBC加密数据
 * @param {object} data - 要加密的数据
 * @param {Buffer} key - 加密密钥
 * @returns {Promise<{iv: string, data: string}>} 包含IV和加密数据的结果
 * @throws {Error} 如果加密失败
 */
async function encrypt_data(data, key) {
  try {
    const iv = crypto.randomBytes(encryption_config.iv_length);
    const cipher = crypto.createCipheriv(encryption_config.algorithm, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data)),
      cipher.final()
    ]);

    return {
      iv: iv.toString("hex"),
      data: encrypted.toString("hex")
    };
  } catch (error) {
    logger.error(`${chalk.red("Data encryption failed:")} ${error.message}`);
    throw error;
  }
}

/**
 * 使用AES-256-CBC解密数据
 * @param {string} encrypted_data - 十六进制格式的加密数据
 * @param {string} iv_hex - 十六进制格式的初始化向量
 * @param {Buffer} key - 加密密钥
 * @returns {Promise<object>} 解密后的数据对象
 * @throws {Error} 如果解密失败或数据无效
 */
async function decrypt_data(encrypted_data, iv_hex, key) {
  try {
    if (!encrypted_data || !iv_hex) {
      throw new Error("Invalid encrypted data or IV");
    }

    const iv = Buffer.from(iv_hex, "hex");
    const decipher = crypto.createDecipheriv(encryption_config.algorithm, key, iv);

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted_data, "hex")),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString());
  } catch (error) {
    logger.error(`${chalk.red("Data decryption failed:")} ${error.message}`);
    throw error;
  }
}

/**
 * 读取并解密加密的配置文件
 * @param {string} file_path - 加密文件的路径
 * @param {Buffer} key - 加密密钥
 * @returns {Promise<object|null>} 解密后的配置对象，如果文件不存在则返回null
 * @throws {Error} 如果文件格式无效
 */
async function read_encrypted_config(file_path, key) {
  try {
    const encrypted = await jsenv.read_config_async(file_path);
    if (!encrypted) return null;

    if (!encrypted.iv || !encrypted.data) {
      throw new Error("Invalid encrypted file format: missing IV or encrypted data");
    }

    return await decrypt_data(encrypted.data, encrypted.iv, key);
  } catch (error) {
    logger.error(`${chalk.red("Failed to read encrypted config:")} ${error.message}`);
    return null;
  }
}

/**
 * 加密并写入配置到文件
 * @param {string} file_path - 写入加密文件的路径
 * @param {object} config - 要加密的配置对象
 * @param {Buffer} key - 加密密钥
 * @returns {Promise<boolean>} 如果写入成功返回true，否则返回false
 */
async function write_encrypted_config(file_path, config, key) {
  try {
    const encrypted = await encrypt_data(config, key);
    await jsenv.write_config_async(file_path, encrypted);
    return true;
  } catch (error) {
    logger.error(`${chalk.red("Failed to write encrypted config:")} ${error.message}`);
    return false;
  }
}

/**
 * AES加密模块导出
 * @namespace AESModule
 * @type {Object}
 * @property {Function} init_encryption - 初始化加密环境
 * @property {Function} read_config - 读取加密配置文件
 * @property {Function} write_config - 写入加密配置文件
 */
export default Object.freeze({
  /** @type {Function} */
  init_encryption,

  /** @type {Function} */
  read_config: read_encrypted_config,
  /** @type {Function} */
  write_config: write_encrypted_config,
});