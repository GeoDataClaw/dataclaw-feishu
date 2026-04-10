#!/bin/bash

# Deployment script for Cloudflare Workers
# Usage: ./scripts/deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}

echo "🚀 Deploying dataclaw Feishu to Cloudflare Workers ($ENVIRONMENT)..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if user is logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please log in to Cloudflare first:"
    wrangler login
fi

# Build the project
echo "📦 Building project..."
npm run build:worker

# Deploy based on environment
case $ENVIRONMENT in
    "production")
        echo "🌍 Deploying to production..."
        wrangler deploy --env production
        ;;
    "staging")
        echo "🧪 Deploying to staging..."
        wrangler deploy --env staging
        ;;
    *)
        echo "❌ Invalid environment. Use 'staging' or 'production'"
        exit 1
        ;;
esac

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your custom domain in Cloudflare dashboard"
echo "2. Set up environment variables if needed:"
echo "   wrangler secret put SNAPPDOWN_API_KEY"
echo "3. Test your deployment"
