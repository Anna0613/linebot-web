-- PostgreSQL 初始化腳本
-- 創建 pgvector 擴展
CREATE EXTENSION IF NOT EXISTS vector;

-- 創建額外的資料庫（如果需要）
-- CREATE DATABASE linebot_test;

-- 設置時區
SET timezone = 'Asia/Taipei';

-- 創建基本的索引和配置
-- 這裡可以添加其他初始化 SQL 語句

-- 顯示初始化完成訊息
SELECT 'PostgreSQL 初始化完成' as message;
