#!/usr/bin/env node

/**
 * 複製 assets 目錄到 dist 目錄的腳本
 * 用於生產建置後處理靜態資源
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`Source directory ${src} does not exist`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 複製 assets 目錄到 dist/assets
// 在 Docker 環境中，assets 目錄會被複製到 frontend 目錄內
const srcDir = fs.existsSync(path.join(__dirname, 'assets'))
  ? path.join(__dirname, 'assets')  // Docker 環境
  : path.join(__dirname, '../assets'); // 本地環境
const destDir = path.join(__dirname, 'dist/assets');

console.log('Copying assets directory...');
console.log(`Source directory: ${srcDir}`);
console.log(`Destination directory: ${destDir}`);
console.log(`Source exists: ${fs.existsSync(srcDir)}`);

copyDir(srcDir, destDir);
console.log('Assets copied successfully!');
