# ============================================
# Docker 清理腳本 - 釋放空間
# ============================================

$ErrorActionPreference = "Continue"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success { param([string]$Message) Write-ColorOutput "✓ $Message" "Green" }
function Write-Info { param([string]$Message) Write-ColorOutput "ℹ $Message" "Cyan" }
function Write-Warning { param([string]$Message) Write-ColorOutput "⚠ $Message" "Yellow" }

Write-Host ""
Write-ColorOutput "╔════════════════════════════════════════════╗" "Cyan"
Write-ColorOutput "║      Docker 空間清理工具                  ║" "Cyan"
Write-ColorOutput "╚════════════════════════════════════════════╝" "Cyan"
Write-Host ""

# 檢查 Docker 是否運行
Write-Info "檢查 Docker 服務..."
try {
    $null = docker ps 2>&1
    Write-Success "Docker 服務正常"
}
catch {
    Write-Warning "Docker 服務未運行"
    Write-Host ""
    Write-Host "請先執行以下步驟："
    Write-Host "1. 關閉 Docker Desktop"
    Write-Host "2. 重新啟動 Docker Desktop"
    Write-Host "3. 等待 Docker 完全啟動後重新執行此腳本"
    Write-Host ""
    Read-Host "按 Enter 鍵退出"
    exit 1
}

Write-Host ""
Write-ColorOutput "═══════════════ 清理選項 ═══════════════" "Yellow"
Write-Host ""
Write-Host "請選擇清理級別："
Write-Host ""
Write-Host "1. 輕度清理 - 僅清理未使用的資源（推薦）"
Write-Host "   - 停止的容器"
Write-Host "   - 未使用的映像檔"
Write-Host "   - 未使用的網路"
Write-Host ""
Write-Host "2. 中度清理 - 清理所有未使用的資源"
Write-Host "   - 包含輕度清理的所有項目"
Write-Host "   - 未使用的卷（Volume）"
Write-Host "   - 建置快取"
Write-Host ""
Write-Host "3. 深度清理 - 完全清理（會刪除所有容器和映像檔）"
Write-Host "   ⚠️  警告：這會刪除所有 Docker 資源！"
Write-Host "   - 所有容器（包含運行中的）"
Write-Host "   - 所有映像檔"
Write-Host "   - 所有卷"
Write-Host "   - 所有網路"
Write-Host "   - 所有建置快取"
Write-Host ""

$choice = Read-Host "請輸入選項 (1, 2 或 3)"

Write-Host ""

switch ($choice) {
    "1" {
        Write-ColorOutput "執行輕度清理..." "Cyan"
        Write-Host ""
        
        Write-Info "清理停止的容器..."
        docker container prune -f
        
        Write-Info "清理未使用的映像檔..."
        docker image prune -f
        
        Write-Info "清理未使用的網路..."
        docker network prune -f
        
        Write-Success "輕度清理完成"
    }
    
    "2" {
        Write-ColorOutput "執行中度清理..." "Cyan"
        Write-Host ""
        
        Write-Info "清理所有未使用的資源..."
        docker system prune -a -f --volumes
        
        Write-Success "中度清理完成"
    }
    
    "3" {
        Write-Warning "⚠️  即將執行深度清理，這會刪除所有 Docker 資源！"
        $confirm = Read-Host "確定要繼續嗎？(輸入 YES 確認)"
        
        if ($confirm -eq "YES") {
            Write-ColorOutput "執行深度清理..." "Red"
            Write-Host ""
            
            Write-Info "停止所有運行中的容器..."
            docker stop $(docker ps -aq) 2>$null
            
            Write-Info "刪除所有容器..."
            docker rm -f $(docker ps -aq) 2>$null
            
            Write-Info "刪除所有映像檔..."
            docker rmi -f $(docker images -aq) 2>$null
            
            Write-Info "刪除所有卷..."
            docker volume rm $(docker volume ls -q) 2>$null
            
            Write-Info "清理系統..."
            docker system prune -a -f --volumes
            
            Write-Success "深度清理完成"
        }
        else {
            Write-Warning "已取消深度清理"
        }
    }
    
    default {
        Write-Warning "無效的選項，已取消清理"
        exit 1
    }
}

Write-Host ""
Write-ColorOutput "═══════════════ 清理結果 ═══════════════" "Green"
Write-Host ""

# 顯示清理後的空間狀態
Write-Info "Docker 磁碟使用情況："
docker system df

Write-Host ""
Write-Success "清理完成！"
Write-Host ""
Write-Info "提示：如果空間仍然不足，請考慮："
Write-Host "1. 在 Docker Desktop 設定中增加磁碟空間限制"
Write-Host "2. 清理 Windows 系統的臨時檔案"
Write-Host "3. 將 Docker 資料目錄移動到其他磁碟"
Write-Host ""

Read-Host "按 Enter 鍵退出"

