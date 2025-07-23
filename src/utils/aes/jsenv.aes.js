import crypto from "crypto";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import log_sys from "./logmy.js";

const logger = log_sys.get_logger("JS.ENV.CRYPTO");

// 加密配置常量
const ENCRYPTION = {
  ALGORITHM: "aes-256-cbc",
  IV_LENGTH: 16,
  PBKDF2: {
    ITERATIONS: 100000,
    SALT_LENGTH: 16,
    KEY_LENGTH: 32,
    DIGEST: "sha256",
  },
};

/**
 * 生成加密密钥 (32字节)
 * @returns {Buffer}
 */
function generate_key() {
  const key = crypto.randomBytes(32);
  logger.log(`生成新加密密钥: ${chalk.yellow(key.toString("hex"))}`);
  return key;
}

/**
 * 从密码派生密钥 (带彩色日志)
 * @param {string} password
 * @param {Buffer} salt
 * @returns {Promise<Buffer>}
 */
async function derive_key(password, salt) {
  logger.log(
    `正在派生密钥 (迭代次数: ${chalk.blue(ENCRYPTION.PBKDF2.ITERATIONS)})...`
  );

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      ENCRYPTION.PBKDF2.ITERATIONS,
      ENCRYPTION.PBKDF2.KEY_LENGTH,
      ENCRYPTION.PBKDF2.DIGEST,
      (err, derivedKey) => {
        if (err) {
          logger.error(`${chalk.red("密钥派生失败:")} ${err.message}`);
          reject(err);
        } else {
          logger.log(`密钥派生成功: ${chalk.green("$")}`);
          resolve(derivedKey);
        }
      }
    );
  });
}

/**
 * 加密数据 (带操作日志)
 * @param {object|string} data
 * @param {Buffer} key
 * @returns {{iv: string, data: string}}
 */
function encrypt(data, key) {
  logger.log(`开始加密数据 (算法: ${chalk.blue(ENCRYPTION.ALGORITHM)})...`);

  const iv = crypto.randomBytes(ENCRYPTION.IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION.ALGORITHM, key, iv);

  const jsonStr = typeof data === "string" ? data : JSON.stringify(data);
  const encrypted = Buffer.concat([
    cipher.update(jsonStr, "utf8"),
    cipher.final(),
  ]);

  logger.log(`加密完成 (数据长度: ${chalk.yellow(encrypted.length)}字节)`);

  return {
    iv: iv.toString("hex"),
    data: encrypted.toString("hex"),
  };
}

/**
 * 解密数据 (带错误处理日志)
 * @param {string} encrypted
 * @param {Buffer} key
 * @param {string} ivHex
 * @returns {object}
 */
function decrypt(encrypted, key, ivHex) {
  try {
    logger.log(`开始解密数据...`);

    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ENCRYPTION.ALGORITHM, key, iv);

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, "hex")),
      decipher.final(),
    ]).toString("utf8");

    logger.log(`${chalk.green("$")} 解密成功`);
    return JSON.parse(decrypted);
  } catch (error) {
    logger.error(`${chalk.red("解密失败:")} ${error.message}`);
    throw new Error("解密失败，可能是密钥不正确");
  }
}

// 扩展原有jsenv功能
export default Object.freeze({
  // 保留原有方法
  ...jsenv,

  /**
   * 读取加密配置文件 (带完整日志)
   * @param {string} file_path
   * @param {Buffer|string} key - 加密密钥或密码
   * @param {string} [specific_key]
   * @param {object} [default_config]
   * @param {boolean} [create_dir]
   * @returns {Promise<any>}
   */
  async read_encrypted(
    file_path,
    key,
    specific_key,
    default_config = {},
    create_dir = true
  ) {
    const abs_path = path.resolve(file_path);
    logger.log(`读取加密配置: ${chalk.yellow(abs_path)}`);

    try {
      // 检查文件是否存在
      let exists;
      try {
        await fs.promises.access(abs_path);
        exists = true;
      } catch {
        exists = false;
        logger.warn(`${chalk.yellow("$")} 配置文件不存在，将创建默认配置`);
      }

      // 文件不存在时创建默认配置
      if (!exists) {
        const success = await this.write_encrypted(
          file_path,
          default_config,
          key,
          create_dir
        );

        if (!success) {
          logger.error(`${chalk.red("$")} 创建默认配置失败`);
          return null;
        }

        logger.log(`${chalk.green("$")} 已创建默认加密配置`);
        return specific_key ? default_config[specific_key] : default_config;
      }

      // 读取加密文件
      logger.log(`正在读取加密文件...`);
      const encryptedContent = await fs.promises.readFile(abs_path, "utf8");
      const { iv, data } = JSON.parse(encryptedContent);

      // 处理密钥
      let decryptionKey = key;
      if (typeof key === "string") {
        logger.log(`使用密码派生解密密钥...`);
        const salt = Buffer.from(iv, "hex").slice(
          0,
          ENCRYPTION.PBKDF2.SALT_LENGTH
        );
        decryptionKey = await derive_key(key, salt);
      }

      // 解密数据
      const config = decrypt(data, decryptionKey, iv);

      logger.log(`${chalk.green("$")} 配置读取成功`);
      return specific_key ? config[specific_key] : config;
    } catch (error) {
      logger.error(`${chalk.red("$")} 读取失败: ${error.message}`);
      return null;
    }
  },

  /**
   * 写入加密配置文件 (带详细日志)
   * @param {string} file_path
   * @param {object} config
   * @param {Buffer|string} key - 加密密钥或密码
   * @param {boolean} [create_dir]
   * @returns {Promise<boolean>}
   */
  async write_encrypted(file_path, config, key, create_dir = true) {
    const abs_path = path.resolve(file_path);
    logger.log(`写入加密配置: ${chalk.yellow(abs_path)}`);

    try {
      // 创建目录
      if (create_dir) {
        const dir = path.dirname(abs_path);
        try {
          await fs.promises.mkdir(dir, { recursive: true });
          logger.log(`已创建目录: ${chalk.blue(dir)}`);
        } catch (err) {
          if (err.code !== "EEXIST") throw err;
        }
      }

      // 加密数据
      let encryptionKey = key;
      let salt;

      if (typeof key === "string") {
        logger.log(`使用密码派生加密密钥...`);
        salt = crypto.randomBytes(ENCRYPTION.PBKDF2.SALT_LENGTH);
        encryptionKey = await derive_key(key, salt);
      }

      const { iv, data } = encrypt(config, encryptionKey);
      const combinedIv = salt
        ? Buffer.concat([salt, Buffer.from(iv, "hex")])
        : Buffer.from(iv, "hex");

      // 原子写入
      const temp_path = `${abs_path}.tmp`;
      await fs.promises.writeFile(
        temp_path,
        JSON.stringify(
          {
            iv: combinedIv.toString("hex"),
            data,
          },
          null,
          2
        )
      );
      await fs.promises.rename(temp_path, abs_path);

      logger.log(`${chalk.green("$")} 加密配置写入成功`);
      return true;
    } catch (error) {
      logger.error(`${chalk.red("$")} 写入失败: ${error.message}`);
      return false;
    }
  },

  // 导出加密工具方法
  crypto_utils: {
    generate_key,
    encrypt,
    decrypt,
  },
});
