/**
 * @fileoverview TOTP密钥管理器
 * @description 提供TOTP密钥的增删改查功能，支持加密存储和TOTP代码生成
 */

"use strict";
import jsenv_aes from "../utils/jsenvaes.js";
import nothing from "../utils/nothing.js";

/**
 * 加密密钥，用于配置文件的加密解密
 * @type {Buffer|null}
 * @private
 */
let key = null;

/**
 * TOTP配置对象
 * @type {Object}
 * @property {Array<Object>} keys - TOTP密钥数组
 * @private
 */
let config = {
  keys: [],
}

/**
 * TOTP密钥示例对象
 * @type {Object}
 * @property {string} name - 密钥名称
 * @property {string} platform - 平台URL
 * @property {string} description - 密钥描述
 * @property {number} rank - 优先级排序
 * @property {string} key - TOTP密钥字符串
 * @readonly
 */
const a_totp_key = Object.freeze({
  name: "TOTP Key",
  platform: "https://x.com",
  description: "X login 2FA key",
  rank: 1,
  key: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
});

/**
 * 初始化TOTP管理器，加载加密密钥和配置文件
 * @param {string} password - 用于密钥派生的密码
 * @returns {Promise<void>}
 * @throws {Error} 当密钥初始化或配置加载失败时
 */
async function init(password) {
  key = await jsenv_aes.init_encryption(".keyfile", password);
  config = nothing.fallback(
    await jsenv_aes.read_config("./config/config.json", key),
    config);
}

/**
 * 保存当前配置到加密文件
 * @returns {Promise<boolean>} 保存是否成功
 * @throws {Error} 当配置保存失败时
 */
async function save() {
  return await jsenv_aes.write_config("./config/config.json", config, key);
}

/**
 * 添加新的TOTP密钥
 * @param {Object} obj - TOTP密钥对象
 * @param {string} obj.name - 密钥名称
 * @param {string} obj.platform - 平台URL
 * @param {string} obj.description - 密钥描述
 * @param {string} obj.key - TOTP密钥字符串
 * @param {number} [obj.rank=1] - 优先级排序，默认为1
 * @returns {Promise<void>}
 */
async function add_totp_key(obj) {
  config.keys.push({
    name: obj.name,
    platform: obj.platform,
    description: obj.description,
    key: obj.key,
    rank: obj.rank || 1,
  })
}

/**
 * 获取所有TOTP密钥的基本信息（不包含敏感的key字段）
 * @returns {Promise<Array<Object>>} TOTP密钥信息数组
 * @property {string} name - 密钥名称
 * @property {string} platform - 平台URL
 * @property {string} description - 密钥描述
 * @property {number} rank - 优先级排序
 */
async function get_totp_info() {
  return config.keys.map(key => ({
    name: key.name,
    platform: key.platform,
    description: key.description,
    rank: key.rank,
  }));
}

/**
 * 根据索引删除TOTP密钥
 * @param {number} index - 要删除的密钥在数组中的索引
 * @returns {Promise<void>}
 * @throws {Error} 当索引超出范围时
 */
async function remove_totp_key(index) {
    config.keys.splice(index, 1);
}

/**
 * 根据索引生成TOTP验证码
 * @param {number} index - 密钥在数组中的索引
 * @returns {Promise<string>} 6位数字的TOTP验证码
 * @throws {Error} 当索引超出范围或TOTP生成失败时
 */
async function generate(index) {
  const totp_key = config.keys[index];
  return jsenv_aes.generate_totp(totp_key.key);
}

/**
 * TOTP管理器模块导出对象
 * @namespace TOTPManager
 * @property {Function} init - 初始化管理器
 * @property {Function} save - 保存配置
 * @property {Function} add_totp_key - 添加TOTP密钥
 * @property {Function} remove_totp_key - 删除TOTP密钥
 * @property {Function} get_totp_info - 获取密钥信息
 * @property {Function} generate - 生成TOTP验证码
 * @property {Object} a_totp_key - 示例TOTP密钥对象
 * @readonly
 */
export default Object.freeze({
  init,
  save,
  add_totp_key,
  remove_totp_key,
  get_totp_info,
  generate,
  a_totp_key,
});