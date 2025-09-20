const fs = require('fs');
const path = require('path');

// 创建一个简单的PNG图标（使用Base64编码的1x1像素PNG）
const createSimplePNG = (size, filename) => {
  // 这是一个简单的1x1像素PNG的Base64编码
  const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  
  // 创建一个简单的彩色PNG（使用Canvas API的替代方案）
  const canvas = require('canvas');
  const { createCanvas } = canvas;
  
  const canvasInstance = createCanvas(size, size);
  const ctx = canvasInstance.getContext('2d');
  
  // 创建渐变背景
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#4F46E5');
  gradient.addColorStop(1, '#7C3AED');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // 添加圆角
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();
  
  // 添加文字
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Z', size / 2, size / 2);
  
  const buffer = canvasInstance.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'assets', filename), buffer);
  console.log(`Created ${filename} (${size}x${size})`);
};

// 检查是否有canvas包
try {
  require('canvas');
  createSimplePNG(1024, 'icon.png');
  createSimplePNG(2048, 'splash.png');
  createSimplePNG(512, 'adaptive-icon.png');
  createSimplePNG(32, 'favicon.png');
} catch (error) {
  console.log('Canvas not available, creating simple placeholder files...');
  
  // 创建简单的占位符文件
  const createPlaceholder = (filename) => {
    const placeholder = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(path.join(__dirname, 'assets', filename), placeholder);
    console.log(`Created placeholder ${filename}`);
  };
  
  createPlaceholder('icon.png');
  createPlaceholder('splash.png');
  createPlaceholder('adaptive-icon.png');
  createPlaceholder('favicon.png');
}
