# ============================================
# LineBot-Web Windows 一鍵部署腳本
# ============================================
# 使用方式：
#   1. 雙擊執行此檔案
#   2. 或在 PowerShell 中執行：.\deploy-windows.ps1
#
# 功能：
#   - 自動部署所有必要的 Docker 服務
#   - 安裝前後端依賴套件
#   - 建立環境配置檔案
#   - 啟動應用容器
# ============================================

$ErrorActionPreference = "Stop"

# 輸出函數
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success { param([string]$Message) Write-ColorOutput "? $Message" "Green" }
function Write-Info { param([string]$Message) Write-ColorOutput "? $Message" "Cyan" }
function Write-Warning { param([string]$Message) Write-ColorOutput "? $Message" "Yellow" }
function Write-Error { param([string]$Message) Write-ColorOutput "? $Message" "Red" }

# 標題
function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-ColorOutput "╔════════════════════════════════════════════╗" "Cyan"
    Write-ColorOutput "║   LineBot-Web Windows 一鍵部署腳本        ║" "Cyan"
    Write-ColorOutput "╚════════════════════════════════════════════╝" "Cyan"
    Write-Host ""
}

# 取得資料儲存路徑
function Get-DataStoragePath {
    Write-Host ""
    Write-ColorOutput "═══════════════ 資料儲存路徑設定 ═══════════════" "Cyan"
    Write-Host ""

    $defaultPath = Resolve-Path "$PSScriptRoot\..\data" -ErrorAction SilentlyContinue
    if (-not $defaultPath) {
        $defaultPath = Join-Path (Split-Path $PSScriptRoot -Parent) "data"
    }

    Write-Info "預設路徑: $defaultPath"
    Write-Host ""
    Write-Host "請選擇："
    Write-Host "  [Enter] 使用預設路徑"
    Write-Host "  或輸入自訂路徑 (例如: D:\linebot-data)"
    Write-Host ""

    $input = Read-Host "儲存路徑"

    # 使用預設路徑
    if ([string]::IsNullOrWhiteSpace($input)) {
        Write-Success "使用預設路徑"
        return $defaultPath
    }

    # 處理自訂路徑
    $customPath = [System.Environment]::ExpandEnvironmentVariables($input)

    if (-not [System.IO.Path]::IsPathRooted($customPath)) {
        $customPath = Join-Path (Get-Location) $customPath
    }

    # 建立並驗證目錄
    try {
        if (-not (Test-Path $customPath)) {
            New-Item -ItemType Directory -Path $customPath -Force | Out-Null
        }

        # 測試寫入權限
        $testFile = Join-Path $customPath ".test"
        "test" | Out-File -FilePath $testFile -ErrorAction Stop
        Remove-Item $testFile -ErrorAction SilentlyContinue

        Write-Success "使用自訂路徑: $customPath"
        return $customPath
    }
    catch {
        Write-Warning "無法使用該路徑，改用預設路徑"
        return $defaultPath
    }
}

# 選擇資料儲存路徑
function Select-DataPath {
    Write-Host ""
    Write-ColorOutput "═══════════════ 資料儲存路徑設定 ═══════════════" "Cyan"
    Write-Host ""
    Write-Info "請選擇資料儲存位置："
    Write-Host ""
    Write-Host "1. 使用專案目錄 (預設)"
    Write-Host "   路徑: $PSScriptRoot\..\data"
    Write-Host ""
    Write-Host "2. 使用自訂路徑"
    Write-Host "   您可以指定任何有足夠空間的磁碟位置"
    Write-Host ""

    $choice = Read-Host "請輸入選項 (1 或 2，直接按 Enter 使用預設)"

    if ([string]::IsNullOrWhiteSpace($choice)) {
        $choice = "1"
    }

    if ($choice -eq "2") {
        Write-Host ""
        Write-Info "請輸入自訂路徑（例如：D:\LineBot-Data）"
        $customPath = Read-Host "路徑"

        if ([string]::IsNullOrWhiteSpace($customPath)) {
            Write-Warning "未輸入路徑，使用預設路徑"
            return "$PSScriptRoot\..\data"
        }

        # 驗證路徑
        try {
            if (-not (Test-Path $customPath)) {
                Write-Info "建立目錄: $customPath"
                New-Item -ItemType Directory -Path $customPath -Force | Out-Null
            }

            # 測試寫入權限
            $testFile = Join-Path $customPath "test.tmp"
            "test" | Out-File $testFile -ErrorAction Stop
            Remove-Item $testFile -ErrorAction SilentlyContinue

            Write-Success "使用自訂路徑: $customPath"
            return $customPath
        }
        catch {
            Write-Error "無法使用該路徑: $_"
            Write-Warning "改用預設路徑"
            return "$PSScriptRoot\..\data"
        }
    }
    else {
        Write-Success "使用預設路徑: $PSScriptRoot\..\data"
        return "$PSScriptRoot\..\data"
    }
}

# 檢查 Docker 是否運行
function Test-DockerRunning {
    Write-Info "檢查 Docker 服務狀態..."
    try {
        $null = docker ps 2>&1
        Write-Success "Docker 服務正在運行"
        return $true
    }
    catch {
        Write-Error "Docker 服務未運行，請先啟動 Docker Desktop"
        return $false
    }
}

# 檢查容器是否存在並運行
function Test-ContainerRunning {
    param([string]$ContainerName)

    try {
        $container = docker ps --filter "name=$ContainerName" --format "{{.Names}}" 2>$null
        return ($null -ne $container -and $container -eq $ContainerName)
    }
    catch {
        Write-Warning "檢查容器 $ContainerName 時發生錯誤: $_"
        return $false
    }
}

# 檢查容器是否存在（不論是否運行）
function Test-ContainerExists {
    param([string]$ContainerName)

    try {
        $container = docker ps -a --filter "name=$ContainerName" --format "{{.Names}}" 2>$null
        return ($null -ne $container -and $container -eq $ContainerName)
    }
    catch {
        return $false
    }
}

# 檢查並部署 PostgreSQL
function Deploy-PostgreSQL {
    param([string]$DataBasePath)

    Write-Info "檢查 PostgreSQL 服務..."

    if (Test-ContainerRunning "postgresql15") {
        Write-Success "PostgreSQL 已在運行"
        return
    }

    Write-Info "部署 PostgreSQL..."

    # 建立資料目錄
    $dataDir = Join-Path $DataBasePath "postgresql"
    if (-not (Test-Path $dataDir)) {
        New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    }

    Write-Info "資料儲存位置: $dataDir"

    # 先拉取映像檔
    Write-Info "下載 PostgreSQL 映像檔..."
    docker pull postgres:15

    if ($LASTEXITCODE -ne 0) {
        Write-Error "無法下載 PostgreSQL 映像檔"
        return
    }

    # 運行容器
    Write-Info "啟動 PostgreSQL 容器..."
    docker run -d `
        --name postgresql15 `
        -e POSTGRES_USER=linebot `
        -e POSTGRES_PASSWORD=linebot123 `
        -e POSTGRES_DB=linebot `
        -e TZ=Asia/Taipei `
        -p 5432:5432 `
        -v "${dataDir}:/var/lib/postgresql/data" `
        --restart unless-stopped `
        postgres:15
    
    # 等待 PostgreSQL 啟動
    Write-Info "等待 PostgreSQL 啟動..."
    Start-Sleep -Seconds 5

    # 安裝 pgvector 擴展
    Write-Info "安裝 pgvector 擴展..."
    docker exec postgresql15 bash -c "DEBIAN_FRONTEND=noninteractive apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql-15-pgvector" 2>&1 | Out-Null

    # 等待安裝完成
    Start-Sleep -Seconds 2

    # 建立 pgvector 擴展
    Write-Info "建立 pgvector 擴展..."
    docker exec postgresql15 psql -U linebot -d linebot -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>&1 | Out-Null

    Write-Success "PostgreSQL 部署完成"
}

# 檢查並部署 Redis
function Deploy-Redis {
    param([string]$DataBasePath)

    Write-Info "檢查 Redis 服務..."

    if (Test-ContainerRunning "redis") {
        Write-Success "Redis 已在運行"
        return
    }

    Write-Info "部署 Redis..."

    $dataDir = Join-Path $DataBasePath "redis"
    if (-not (Test-Path $dataDir)) {
        New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    }

    Write-Info "資料儲存位置: $dataDir"

    # 先拉取映像檔
    Write-Info "下載 Redis 映像檔..."
    docker pull redis:7-alpine

    if ($LASTEXITCODE -ne 0) {
        Write-Error "無法下載 Redis 映像檔"
        return
    }

    # 運行容器
    Write-Info "啟動 Redis 容器..."
    docker run -d `
        --name redis `
        -p 6379:6379 `
        -v "${dataDir}:/data" `
        --restart unless-stopped `
        redis:7-alpine redis-server --appendonly yes

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Redis 部署完成"
    }
    else {
        Write-Warning "Redis 部署可能失敗，請檢查日誌: docker logs redis"
    }
}

# 檢查並部署 MongoDB
function Deploy-MongoDB {
    param([string]$DataBasePath)

    Write-Info "檢查 MongoDB 服務..."

    if (Test-ContainerRunning "mongodb") {
        Write-Success "MongoDB 已在運行"
        return
    }

    # 如果容器存在但未運行，先刪除
    if (Test-ContainerExists "mongodb") {
        Write-Info "移除舊的 MongoDB 容器..."
        docker rm -f mongodb 2>&1 | Out-Null
    }

    Write-Info "部署 MongoDB..."

    $dataDir = Join-Path $DataBasePath "mongodb"
    if (-not (Test-Path $dataDir)) {
        New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    }

    Write-Info "資料儲存位置: $dataDir"

    try {
        # 檢測系統架構
        $arch = docker version --format '{{.Server.Arch}}' 2>$null
        Write-Info "系統架構: $arch"

        # MongoDB 7 不支援 32 位元系統，使用較舊版本
        $mongoImage = "mongo:7"

        if ($arch -match "386" -or $arch -match "x86") {
            Write-Warning "偵測到 32 位元系統，MongoDB 7 不支援"
            Write-Info "改用 MongoDB 4.4 版本（最後支援 32 位元的版本）"
            $mongoImage = "mongo:4.4"
        }
        elseif ($arch -match "amd64" -or $arch -match "x86_64") {
            Write-Info "偵測到 64 位元系統，使用 MongoDB 7"
            $mongoImage = "mongo:7"
        }

        # 先拉取映像檔
        Write-Info "下載 MongoDB 映像檔 ($mongoImage)..."
        docker pull $mongoImage

        if ($LASTEXITCODE -ne 0) {
            throw "無法下載 MongoDB 映像檔"
        }

        # 運行容器
        Write-Info "啟動 MongoDB 容器..."
        docker run -d `
            --name mongodb `
            -p 27017:27017 `
            -v "${dataDir}:/data/db" `
            --restart unless-stopped `
            $mongoImage

        if ($LASTEXITCODE -eq 0) {
            # 等待容器啟動並檢查狀態
            Write-Info "等待 MongoDB 啟動..."
            Start-Sleep -Seconds 5

            $containerStatus = docker inspect -f '{{.State.Status}}' mongodb 2>$null

            if ($containerStatus -eq "running") {
                Write-Success "MongoDB 部署完成 (版本: $mongoImage)"
            }
            else {
                # 顯示錯誤日誌
                $logs = docker logs mongodb 2>&1 | Select-Object -Last 20
                Write-Warning "MongoDB 容器啟動異常"
                Write-Host "最近的錯誤日誌:" -ForegroundColor Yellow
                $logs | ForEach-Object { Write-Host $_ -ForegroundColor Gray }

                # 清理失敗的容器
                docker rm -f mongodb 2>&1 | Out-Null
                throw "MongoDB 容器無法正常運行"
            }
        }
        else {
            throw "MongoDB 容器啟動失敗"
        }
    }
    catch {
        Write-Warning "MongoDB 部署失敗: $_"
        Write-Host ""
        Write-Info "可能的解決方案："
        Write-Host "  1. 確認 Docker Desktop 正在運行" -ForegroundColor Cyan
        Write-Host "  2. 手動部署: docker run -d --name mongodb -p 27017:27017 -v ${dataDir}:/data/db mongo:7" -ForegroundColor Cyan
        Write-Host "  3. 查看日誌: docker logs mongodb" -ForegroundColor Cyan
        Write-Host ""
    }
}

# 檢查並部署 MinIO
function Deploy-MinIO {
    param([string]$DataBasePath)

    Write-Info "檢查 MinIO 服務..."

    if (Test-ContainerRunning "minio") {
        Write-Success "MinIO 已在運行"
        return
    }

    # 如果容器存在但未運行，先刪除
    if (Test-ContainerExists "minio") {
        Write-Info "移除舊的 MinIO 容器..."
        docker rm -f minio 2>&1 | Out-Null
    }

    Write-Info "部署 MinIO..."

    $dataDir = Join-Path $DataBasePath "minio"
    if (-not (Test-Path $dataDir)) {
        New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    }

    Write-Info "資料儲存位置: $dataDir"

    try {
        # 先拉取映像檔
        Write-Info "下載 MinIO 映像檔..."
        docker pull minio/minio:latest

        if ($LASTEXITCODE -ne 0) {
            throw "無法下載 MinIO 映像檔"
        }

        # 運行容器
        Write-Info "啟動 MinIO 容器..."
        docker run -d `
            --name minio `
            -p 9000:9000 `
            -p 9001:9001 `
            -e MINIO_ROOT_USER=minioadmin `
            -e MINIO_ROOT_PASSWORD=minioadmin `
            -v "${dataDir}:/data" `
            --restart unless-stopped `
            minio/minio server /data --console-address ":9001"

        if ($LASTEXITCODE -eq 0) {
            # 等待容器啟動並檢查狀態
            Write-Info "等待 MinIO 啟動..."
            Start-Sleep -Seconds 5

            $containerStatus = docker inspect -f '{{.State.Status}}' minio 2>$null

            if ($containerStatus -eq "running") {
                Write-Success "MinIO 部署完成"
            }
            else {
                # 顯示錯誤日誌
                $logs = docker logs minio 2>&1 | Select-Object -Last 20
                Write-Warning "MinIO 容器啟動異常"
                Write-Host "最近的錯誤日誌:" -ForegroundColor Yellow
                $logs | ForEach-Object { Write-Host $_ -ForegroundColor Gray }

                # 清理失敗的容器
                docker rm -f minio 2>&1 | Out-Null
                throw "MinIO 容器無法正常運行"
            }
        }
        else {
            throw "MinIO 容器啟動失敗"
        }
    }
    catch {
        Write-Warning "MinIO 部署失敗: $_"
        Write-Host ""
        Write-Info "可能的解決方案："
        Write-Host "  1. 確認 Docker Desktop 正在運行" -ForegroundColor Cyan
        Write-Host "  2. 手動部署: docker run -d --name minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin -v ${dataDir}:/data minio/minio server /data --console-address :9001" -ForegroundColor Cyan
        Write-Host "  3. 查看日誌: docker logs minio" -ForegroundColor Cyan
        Write-Host ""
    }
}

# 檢查並建立環境配置檔案
function Setup-EnvironmentFiles {
    Write-Info "檢查環境配置檔案..."

    # 後端環境檔案
    $backendEnv = "$PSScriptRoot\..\backend\.env"
    if (-not (Test-Path $backendEnv)) {
        Write-Info "建立後端環境配置檔案..."
        Copy-Item "$PSScriptRoot\..\backend\env.example" $backendEnv

        # 更新資料庫連線資訊
        (Get-Content $backendEnv) `
            -replace 'DB_HOST=localhost', 'DB_HOST=host.docker.internal' `
            -replace 'DB_NAME=your_database_name', 'DB_NAME=linebot' `
            -replace 'DB_USER=your_database_user', 'DB_USER=linebot' `
            -replace 'DB_PASSWORD=your_database_password', 'DB_PASSWORD=linebot123' `
            -replace 'REDIS_HOST=localhost', 'REDIS_HOST=host.docker.internal' `
            -replace 'MONGODB_HOST=localhost', 'MONGODB_HOST=host.docker.internal' `
            -replace 'MINIO_ENDPOINT=localhost:9000', 'MINIO_ENDPOINT=host.docker.internal:9000' |
            Set-Content $backendEnv

        Write-Success "已建立 backend\.env"
        Write-Warning "請編輯 backend\.env 設定 LINE API 金鑰和其他必要參數"
    }
    else {
        Write-Success "後端環境配置檔案已存在"
    }

    # 前端環境檔案
    $frontendEnv = "$PSScriptRoot\..\frontend\.env"
    if (-not (Test-Path $frontendEnv)) {
        Write-Info "建立前端環境配置檔案..."
        Copy-Item "$PSScriptRoot\..\frontend\env.example" $frontendEnv
        Write-Success "已建立 frontend\.env"
    }
    else {
        Write-Success "前端環境配置檔案已存在"
    }
}

# 安裝前端依賴
function Install-FrontendDependencies {
    Write-Info "檢查前端依賴..."

    Push-Location "$PSScriptRoot\..\frontend"

    try {
        # 檢查 pnpm 是否安裝
        $pnpmExists = Get-Command pnpm -ErrorAction SilentlyContinue

        if (-not $pnpmExists) {
            Write-Warning "pnpm 未安裝，使用 npm 安裝依賴..."
            npm install
        }
        else {
            Write-Info "使用 pnpm 安裝前端依賴..."
            pnpm install
        }

        Write-Success "前端依賴安裝完成"
    }
    catch {
        Write-Error "前端依賴安裝失敗: $_"
        throw
    }
    finally {
        Pop-Location
    }
}

# 安裝後端依賴
function Install-BackendDependencies {
    Write-Info "檢查後端依賴..."

    Push-Location "$PSScriptRoot\..\backend"

    try {
        # 檢查虛擬環境
        if (-not (Test-Path "venv")) {
            Write-Info "建立 Python 虛擬環境..."
            python -m venv venv
        }

        # 啟動虛擬環境並安裝依賴
        Write-Info "安裝後端依賴..."
        & ".\venv\Scripts\Activate.ps1"
        python -m pip install --upgrade pip
        pip install -r requirements.txt

        Write-Success "後端依賴安裝完成"
    }
    catch {
        Write-Error "後端依賴安裝失敗: $_"
        throw
    }
    finally {
        Pop-Location
    }
}

# 執行資料庫遷移
function Run-DatabaseMigration {
    Write-Info "執行資料庫遷移..."

    Push-Location "$PSScriptRoot\..\backend"

    try {
        & ".\venv\Scripts\Activate.ps1"

        # 檢查 alembic 是否已初始化
        if (Test-Path "alembic.ini") {
            Write-Info "執行 Alembic 遷移..."
            alembic upgrade head
            Write-Success "資料庫遷移完成"
        }
        else {
            Write-Warning "未找到 alembic.ini，跳過資料庫遷移"
        }
    }
    catch {
        Write-Warning "資料庫遷移失敗: $_"
        Write-Warning "請稍後手動執行遷移"
    }
    finally {
        Pop-Location
    }
}

# 建立必要目錄
function Create-RequiredDirectories {
    Write-Info "建立必要目錄..."

    $directories = @(
        "$PSScriptRoot\..\logs",
        "$PSScriptRoot\..\uploads",
        "$PSScriptRoot\..\backups",
        "$PSScriptRoot\..\data",
        "$PSScriptRoot\..\backend\media",
        "$PSScriptRoot\..\backend\logs"
    )

    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }

    Write-Success "目錄建立完成"
}

# 啟動應用容器
function Start-ApplicationContainers {
    Write-Info "啟動應用容器..."

    Push-Location "$PSScriptRoot\.."

    try {
        # 使用 docker-compose 啟動
        docker-compose up -d --build

        Write-Success "應用容器啟動完成"
    }
    catch {
        Write-Error "應用容器啟動失敗: $_"
        throw
    }
    finally {
        Pop-Location
    }
}

# 健康檢查
function Test-ServicesHealth {
    Write-Info "執行服務健康檢查..."
    Write-Host ""

    $services = @(
        @{Name="PostgreSQL"; Port=5432; Container="postgresql15"},
        @{Name="Redis"; Port=6379; Container="redis"},
        @{Name="MongoDB"; Port=27017; Container="mongodb"},
        @{Name="MinIO"; Port=9000; Container="minio"},
        @{Name="Backend API"; Port=8001; Container="linebot-web-backend"},
        @{Name="Frontend"; Port=3000; Container="linebot-web-frontend"}
    )

    $allHealthy = $true

    foreach ($service in $services) {
        $isRunning = Test-ContainerRunning $service.Container

        if ($isRunning) {
            Write-Success "$($service.Name) 運行正常 (Port: $($service.Port))"
        }
        else {
            Write-Warning "$($service.Name) 未運行"
            $allHealthy = $false
        }
    }

    Write-Host ""
    return $allHealthy
}

# 顯示訪問資訊
function Show-AccessInfo {
    param([string]$DataBasePath)

    Write-Host ""
    Write-ColorOutput "╔════════════════════════════════════════════╗" "Green"
    Write-ColorOutput "║          部署完成！服務訪問資訊            ║" "Green"
    Write-ColorOutput "╚════════════════════════════════════════════╝" "Green"
    Write-Host ""

    Write-ColorOutput "?? 應用服務：" "Cyan"
    Write-Host "   前端應用:     http://localhost:3000"
    Write-Host "   後端 API:     http://localhost:8001"
    Write-Host "   API 文檔:     http://localhost:8001/docs"
    Write-Host ""

    Write-ColorOutput "???  資料庫服務：" "Cyan"
    Write-Host "   PostgreSQL:   localhost:5432"
    Write-Host "   Redis:        localhost:6379"
    Write-Host "   MongoDB:      localhost:27017"
    Write-Host ""

    Write-ColorOutput "?? 儲存服務：" "Cyan"
    Write-Host "   MinIO:        http://localhost:9000"
    Write-Host "   MinIO 控制台: http://localhost:9001"
    Write-Host "   (帳號/密碼: minioadmin/minioadmin)"
    Write-Host ""

    if ($DataBasePath) {
        Write-ColorOutput "?? 資料儲存位置：" "Cyan"
        Write-Host "   $DataBasePath"
        Write-Host ""
    }

    Write-ColorOutput "?? 下一步：" "Yellow"
    Write-Host "   1. 編輯 backend\.env 設定 LINE API 金鑰"
    Write-Host "   2. 重啟後端容器: docker restart linebot-web-backend"
    Write-Host "   3. 查看日誌: docker-compose logs -f"
    Write-Host ""
}

# 主程式
function Main {
    try {
        Show-Banner

        Write-Info "正在檢查系統環境..."

        # 檢查 Docker
        if (-not (Test-DockerRunning)) {
            Write-Host ""
            Write-Error "請先啟動 Docker Desktop 後再執行此腳本"
            Read-Host "按 Enter 鍵退出"
            exit 1
        }

        # 選擇資料儲存路徑
        $dataBasePath = Get-DataStoragePath
        Write-Host ""

        # 開始部署
        Write-ColorOutput "════════════════════════════════════════════" "Magenta"
        Write-ColorOutput "  開始部署 LineBot-Web 專案" "Magenta"
        Write-ColorOutput "════════════════════════════════════════════" "Magenta"
        Write-Host ""

        # 1. 部署基礎服務
        Write-ColorOutput "? 步驟 1/7: 部署基礎服務 (PostgreSQL, Redis, MongoDB, MinIO)" "Yellow"
        Deploy-PostgreSQL -DataBasePath $dataBasePath
        Deploy-Redis -DataBasePath $dataBasePath
        Deploy-MongoDB -DataBasePath $dataBasePath
        Deploy-MinIO -DataBasePath $dataBasePath
        Write-Host ""

        # 2. 建立環境配置
        Write-ColorOutput "? 步驟 2/7: 建立環境配置檔案" "Yellow"
        Setup-EnvironmentFiles
        Write-Host ""

        # 3. 建立必要目錄
        Write-ColorOutput "? 步驟 3/7: 建立必要目錄" "Yellow"
        Create-RequiredDirectories
        Write-Host ""

        # 4. 安裝前端依賴
        Write-ColorOutput "? 步驟 4/7: 安裝前端依賴" "Yellow"
        Install-FrontendDependencies
        Write-Host ""

        # 5. 安裝後端依賴
        Write-ColorOutput "? 步驟 5/7: 安裝後端依賴" "Yellow"
        Install-BackendDependencies
        Write-Host ""

        # 6. 執行資料庫遷移
        Write-ColorOutput "? 步驟 6/7: 執行資料庫遷移" "Yellow"
        Run-DatabaseMigration
        Write-Host ""

        # 7. 啟動應用容器
        Write-ColorOutput "? 步驟 7/7: 啟動應用容器" "Yellow"
        Start-ApplicationContainers
        Write-Host ""

        # 等待服務啟動
        Write-Info "等待服務完全啟動..."
        Start-Sleep -Seconds 10

        # 健康檢查
        Write-ColorOutput "════════════════════════════════════════════" "Cyan"
        Write-ColorOutput "  服務健康檢查" "Cyan"
        Write-ColorOutput "════════════════════════════════════════════" "Cyan"
        Write-Host ""
        $healthy = Test-ServicesHealth

        # 顯示訪問資訊
        Show-AccessInfo -DataBasePath $dataBasePath

        if (-not $healthy) {
            Write-Warning "部分服務未正常運行，請檢查日誌: docker-compose logs -f"
        }

        # 清理 Docker 構建緩存
        Write-Host ""
        Write-ColorOutput "════════════════════════════════════════════" "Yellow"
        Write-Info "清理 Docker 構建緩存..."

        try {
            # 清理未使用的構建緩存
            $pruneResult = docker builder prune -f 2>&1

            if ($LASTEXITCODE -eq 0) {
                Write-Success "Docker 構建緩存已清理"

                # 顯示清理結果
                if ($pruneResult -match "Total:\s+(.+)") {
                    Write-Info "釋放空間: $($matches[1])"
                }
            }
            else {
                Write-Info "跳過緩存清理"
            }
        }
        catch {
            Write-Info "無法清理構建緩存，已跳過"
        }

        Write-Host ""
        Write-Success "?? 部署完成！"
        Write-Host ""
        Write-Host "按 Enter 鍵退出..."
        Read-Host

    }
    catch {
        Write-Host ""
        Write-ColorOutput "════════════════════════════════════════════" "Red"
        Write-Error "部署失敗: $($_.Exception.Message)"
        Write-ColorOutput "════════════════════════════════════════════" "Red"
        Write-Host ""
        Write-Host "請檢查錯誤訊息並重試"
        Write-Host ""
        Write-Host "按 Enter 鍵退出..."
        Read-Host
        exit 1
    }
}

# 執行主程式
Main

