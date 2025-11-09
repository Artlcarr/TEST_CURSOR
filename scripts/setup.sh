#!/bin/bash

# TogetherUnite Setup Script

set -e

echo "🚀 Setting up TogetherUnite..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "⚠️  AWS CLI not found. Please install AWS CLI."
    exit 1
fi

echo "✅ AWS CLI version: $(aws --version)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend/campaigns && npm install && cd ../..
cd backend/auth && npm install && cd ../..
cd backend/payments && npm install && cd ../..
cd backend/email && npm install && cd ../..
cd backend/email/bounce-handler && npm install && cd ../../..

# Install infrastructure dependencies
echo "📦 Installing infrastructure dependencies..."
cd infra
npm install
cd ..

# Create environment files
echo "📝 Creating environment files..."
if [ ! -f frontend/.env.local ]; then
    echo "Creating frontend/.env.local from example..."
    cp frontend/.env.example frontend/.env.local 2>/dev/null || echo "# Add your environment variables here" > frontend/.env.local
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update frontend/.env.local with your configuration"
echo "2. Update infra/.env.example with your AWS credentials"
echo "3. Run 'npm run bootstrap' to bootstrap CDK"
echo "4. Run 'npm run deploy' to deploy infrastructure"
echo "5. Run 'npm run dev' to start development server"

