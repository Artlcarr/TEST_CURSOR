#!/bin/bash

# TogetherUnite Deployment Script

set -e

echo "🚀 Starting TogetherUnite deployment..."

# Check prerequisites
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI."
    exit 1
fi

if ! command -v cdk &> /dev/null; then
    echo "❌ AWS CDK not found. Installing..."
    npm install -g aws-cdk
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo "🏗️  Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Build infrastructure
echo "🏗️  Building infrastructure..."
cd infra
npm install
npm run build
cd ..

# Bootstrap CDK (first time only)
echo "🔧 Bootstrapping CDK..."
cd infra
cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/us-east-1 || true
cd ..

# Deploy infrastructure
echo "☁️  Deploying infrastructure..."
cd infra
cdk deploy --all --require-approval never
cd ..

# Deploy frontend to S3
echo "📤 Deploying frontend to S3..."
# This would be handled by CDK, but you can also manually sync:
# aws s3 sync frontend/out s3://your-bucket-name --delete

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update environment variables in frontend/.env.local"
echo "2. Configure Stripe webhook endpoint"
echo "3. Verify SES email sending domain"
echo "4. Test the application"

