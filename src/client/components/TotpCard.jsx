import React, { useState, useEffect } from "react";
import { Card, CardBody, Button, Chip, Progress } from "@heroui/react";

/**
 * TOTP卡片组件
 * @param {Object} props - 组件属性
 * @param {string} props.name - 服务名称
 * @param {string} props.platform - 平台名称
 * @param {string} props.description - 描述信息
 * @param {string} [props.color="primary"] - 卡片主题色
 * @param {Function} props.onGenerate - 生成TOTP代码的回调函数
 * @param {Function} props.onDelete - 删除的回调函数
 * @returns {JSX.Element} TOTP卡片组件
 */
function TotpCard({ name, platform, description, color = "primary", onGenerate }) {
  const [totpCode, setTotpCode] = useState("------");
  const [timeLeft, setTimeLeft] = useState(30);
  const [isHovered, setIsHovered] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // 计算剩余时间
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setTimeLeft(remaining);
      
      // 自动生成新代码
      if (remaining === 30 && totpCode !== "------") {
        handleGenerate();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []); // 移除 totpCode 依赖，避免无限循环

  // 生成TOTP代码
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const code = await onGenerate();
      setTotpCode(code);
    } catch (error) {
      console.error("Failed to generate TOTP:", error);
      setTotpCode("ERROR");
    } finally {
      setIsGenerating(false);
    }
  };

  // 复制到剪贴板
  const handleCopy = async () => {
    if (totpCode !== "------" && totpCode !== "ERROR") {
      try {
        await navigator.clipboard.writeText(totpCode);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  // 获取进度条颜色
  const getProgressColor = () => {
    if (timeLeft <= 5) return "danger";
    if (timeLeft <= 10) return "warning";
    return color;
  };

  return (
    <Card 
      className="w-80 h-48 transition-all duration-300 cursor-pointer"
      isPressable
      isHoverable
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardBody className="p-6 relative overflow-hidden">
        {/* 默认状态：显示平台信息和倒计时 */}
        <div className={`transition-all duration-300 ${
          isHovered ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}>
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-xl font-bold">{name}</h3>
              <p className="text-sm text-default-500">{description}</p>
            </div>
            
            <Chip 
              size="lg"
              color={color}
              variant="flat"
            >
              {platform}
            </Chip>

            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg font-mono font-bold">
                  {timeLeft}s
                </span>
              </div>
              <Progress 
                value={(timeLeft / 30) * 100} 
                size="md"
                color={getProgressColor()}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* 悬停状态：显示TOTP代码和操作按钮 */}
        <div className={`absolute inset-0 p-6 transition-all duration-300 ${
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}>
          <div className="h-full flex flex-col justify-center items-center space-y-4">
            <div className="text-center">
              <h4 className="text-lg font-semibold text-default-700 mb-2">{platform}</h4>
              <div className="text-3xl font-mono font-bold tracking-wider">
                {isGenerating ? (
                  <div className="animate-pulse">生成中...</div>
                ) : (
                  <span className={totpCode === "ERROR" ? "text-danger" : "text-foreground"}>
                    {totpCode}
                  </span>
                )}
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                size="sm"
                color={color}
                variant="solid"
                onPress={handleCopy}
                isDisabled={totpCode === "------" || totpCode === "ERROR"}
              >
                {isCopied ? "已复制!" : "复制"}
              </Button>
              
              <Button
                size="sm"
                color={color}
                variant="bordered"
                onPress={handleGenerate}
                isLoading={isGenerating}
              >
                刷新
              </Button>
            </div>

            <div className="text-xs text-default-400">
              {timeLeft}s 后自动刷新
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default TotpCard;