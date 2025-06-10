-- 添加頭像功能到users表
-- 執行此腳本來修改資料庫架構

-- 新增頭像相關欄位
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_base64 TEXT,
ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMP WITHOUT TIME ZONE;

-- 建立索引提升查詢效能
CREATE INDEX IF NOT EXISTS idx_users_avatar_updated_at ON users(avatar_updated_at);

-- 加入大小限制約束（約2MB的Base64編碼）
-- 使用DO語句來檢查約束是否已存在，避免重複建立
DO $$
BEGIN
    -- 檢查約束是否已存在
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_avatar_size' 
        AND table_name = 'users'
    ) THEN
        -- 如果約束不存在，則建立它
        ALTER TABLE users 
        ADD CONSTRAINT check_avatar_size 
        CHECK (LENGTH(avatar_base64) <= 2097152);
    END IF;
END $$;

-- 檢查修改結果
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
