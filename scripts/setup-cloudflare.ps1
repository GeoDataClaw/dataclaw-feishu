# PowerShell script for setting up Cloudflare Workers deployment
# Usage: .\scripts\setup-cloudflare.ps1

Write-Host "🚀 Setting up dataclaw Feishu for Cloudflare Workers..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies." -ForegroundColor Red
    exit 1
}

# Check if wrangler is available
try {
    $wranglerVersion = npx wrangler --version
    Write-Host "✅ Wrangler version: $wranglerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Wrangler not found. Installing..." -ForegroundColor Yellow
    npm install -g wrangler
}

# Check if user is logged in to Cloudflare
Write-Host "🔐 Checking Cloudflare authentication..." -ForegroundColor Yellow
try {
    $whoami = npx wrangler whoami 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Already logged in to Cloudflare" -ForegroundColor Green
    } else {
        throw "Not logged in"
    }
} catch {
    Write-Host "🔐 Please log in to Cloudflare:" -ForegroundColor Yellow
    npx wrangler login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to log in to Cloudflare." -ForegroundColor Red
        exit 1
    }
}

# Build the project
Write-Host "🔨 Building project..." -ForegroundColor Yellow
npm run build:worker

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Deploy to staging: npm run deploy:staging" -ForegroundColor White
Write-Host "2. Deploy to production: npm run deploy:production" -ForegroundColor White
Write-Host "3. Configure custom domain in Cloudflare dashboard" -ForegroundColor White
Write-Host "4. Set environment variables if needed:" -ForegroundColor White
Write-Host "   npx wrangler secret put SNAPPDOWN_API_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "🔗 Useful commands:" -ForegroundColor Cyan
Write-Host "- Local development: npm run worker:dev" -ForegroundColor White
Write-Host "- View logs: npx wrangler tail" -ForegroundColor White
Write-Host "- Preview locally: npm run worker:preview" -ForegroundColor White
