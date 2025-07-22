/**
 * 生成 TOTP 验证码
 * @param {string} secret - Base32 编码的共享密钥
 * @param {number} now_time_utc - 当前 UTC 时间戳（毫秒）
 * @param {number} time_step - 时间步长（秒，默认30）
 * @param {number} digits - 验证码位数（默认6）
 * @return {string} TOTP 验证码
 */
function generate_totp(secret, now_time_utc, time_step = 30, digits = 6) {
    // 1. 解码 Base32 密钥
    const key = decode_b32(secret);
    
    // 2. 计算时间计数器
    const counter = Math.floor(now_time_utc / 1000 / time_step);
    
    // 3. 将计数器转为8字节大端序
    const counter_bytes = new Uint8Array(8);
    for (let i = 7; i >= 0; i--) {
        counter_bytes[i] = counter & 0xff;
        counter >>>= 8;
    }
    
    // 4. 计算 HMAC-SHA1
    const hmac = hmac_sha1(key, counter_bytes);
    
    // 5. 动态截断
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
    
    // 6. 生成指定位数的验证码
    const otp = binary % Math.pow(10, digits);
    return otp.toString().padStart(digits, '0');
}

/**
 * Base32 解码
 * @param {string} str - Base32 编码字符串
 * @return {Uint8Array} 解码后的字节数组
 */
function decode_b32(str) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const clean = str.replace(/=+$/, "").toUpperCase();
    const length = clean.length;
    const result = new Uint8Array(Math.floor(length * 5 / 8));
    
    let buf = 0;     // 缓冲区
    let next = 0;    // 结果数组指针
    let bits = 0;    // 当前缓冲位数
    
    for (const char of clean) {
        const index = chars.indexOf(char);
        if (index === -1) continue;  // 跳过非法字符
        
        buf <<= 5;          // 左移5位
        buf |= index & 0x1f; // 添加新数据
        bits += 5;          // 增加位数计数
        
        // 当缓冲区有足够数据时提取字节
        while (bits >= 8) {
            bits -= 8;
            result[next++] = (buf >> bits) & 0xff;
        }
    }
    
    return result;
}

/**
 * HMAC-SHA1 计算
 * @param {Uint8Array} key - 密钥字节数组
 * @param {Uint8Array} msg - 消息字节数组
 * @return {Uint8Array} HMAC 结果
 */
function hmac_sha1(key, msg) {
    // 密钥处理：如果超过64字节则先哈希
    let key_bytes = key;
    if (key.length > 64) {
        key_bytes = sha1(key);
    }
    
    // 创建填充密钥
    const ipad = new Uint8Array(64);  // 内部填充
    const opad = new Uint8Array(64);  // 外部填充
    
    for (let i = 0; i < 64; i++) {
        ipad[i] = (i < key_bytes.length ? key_bytes[i] : 0) ^ 0x36;
        opad[i] = (i < key_bytes.length ? key_bytes[i] : 0) ^ 0x5c;
    }
    
    // 计算内部哈希 (ipad ⊕ key || message)
    const inner_msg = new Uint8Array(ipad.length + msg.length);
    inner_msg.set(ipad, 0);
    inner_msg.set(msg, ipad.length);
    const inner_hash = sha1(inner_msg);
    
    // 计算外部哈希 (opad ⊕ key || inner_hash)
    const outer_msg = new Uint8Array(opad.length + inner_hash.length);
    outer_msg.set(opad, 0);
    outer_msg.set(inner_hash, opad.length);
    
    return sha1(outer_msg);
}

/**
 * SHA1 哈希计算
 * @param {Uint8Array} message - 输入消息
 * @return {Uint8Array} 哈希结果（20字节）
 */
function sha1(message) {
    // 循环左移辅助函数
    function rotate_left(n, s) {
        return (n << s) | (n >>> (32 - s));
    }
    
    // 初始化哈希值
    const h = [
        0x67452301, 
        0xEFCDAB89, 
        0x98BADCFE, 
        0x10325476, 
        0xC3D2E1F0
    ];
    
    const msg_len = message.length;
    
    // 消息填充：长度对齐到64字节的倍数
    const pad_len = (((msg_len + 8) >>> 6) + 1) * 64;
    const padded = new Uint8Array(pad_len);
    padded.set(message, 0);
    padded[msg_len] = 0x80;  // 添加1比特
    
    // 添加原始消息长度（位）的大端表示
    const len_bits = msg_len * 8;
    for (let i = 0; i < 8; i++) {
        padded[pad_len - 8 + i] = (len_bits >>> (56 - i * 8)) & 0xff;
    }
    
    // 处理每个512位（64字节）块
    for (let i = 0; i < pad_len; i += 64) {
        const block = padded.slice(i, i + 64);
        const words = new Uint32Array(80);
        
        // 初始化前16个字（32位）
        for (let j = 0; j < 16; j++) {
            words[j] = 
                (block[j * 4] << 24) |
                (block[j * 4 + 1] << 16) |
                (block[j * 4 + 2] << 8) |
                block[j * 4 + 3];
        }
        
        // 扩展剩余的字
        for (let j = 16; j < 80; j++) {
            words[j] = rotate_left(
                words[j - 3] ^ words[j - 8] ^ words[j - 14] ^ words[j - 16],
                1
            );
        }
        
        // 初始化当前块的哈希值
        let [a, b, c, d, e] = h;
        
        // 主循环
        for (let j = 0; j < 80; j++) {
            let f, k;
            
            // 根据轮次选择不同的逻辑函数和常量
            if (j < 20) {
                f = (b & c) | ((~b) & d);
                k = 0x5A827999;
            } else if (j < 40) {
                f = b ^ c ^ d;
                k = 0x6ED9EBA1;
            } else if (j < 60) {
                f = (b & c) | (b & d) | (c & d);
                k = 0x8F1BBCDC;
            } else {
                f = b ^ c ^ d;
                k = 0xCA62C1D6;
            }
            
            // 计算临时值
            const temp = (rotate_left(a, 5) + f + e + k + words[j]) >>> 0;
            e = d;
            d = c;
            c = rotate_left(b, 30) >>> 0;
            b = a;
            a = temp;
        }
        
        // 更新哈希值
        h[0] = (h[0] + a) >>> 0;
        h[1] = (h[1] + b) >>> 0;
        h[2] = (h[2] + c) >>> 0;
        h[3] = (h[3] + d) >>> 0;
        h[4] = (h[4] + e) >>> 0;
    }
    
    // 将哈希值转换为字节数组
    const result = new Uint8Array(20);
    for (let i = 0; i < 5; i++) {
        result[i * 4] = (h[i] >>> 24) & 0xff;
        result[i * 4 + 1] = (h[i] >>> 16) & 0xff;
        result[i * 4 + 2] = (h[i] >>> 8) & 0xff;
        result[i * 4 + 3] = h[i] & 0xff;
    }
    
    return result;
}

export default Object.freeze({
    generate_totp,
    decode_b32,
    hmac_sha1,
    sha1
});