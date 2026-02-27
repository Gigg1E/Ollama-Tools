#!/bin/bash

echo "🚀 Setting up Ollama Tools API..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Create logs directory
mkdir -p logs
echo "✅ Created logs directory"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📌 PM2 is not installed. Installing globally..."
    npm install -g pm2
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install PM2. You may need to run with sudo:"
        echo "   sudo npm install -g pm2"
        exit 1
    fi
    
    echo "✅ PM2 installed"
else
    echo "✅ PM2 already installed: $(pm2 --version)"
fi

echo ""
echo "🎯 Starting the server with PM2..."

# Start with PM2
pm2 start ecosystem.config.js

if [ $? -ne 0 ]; then
    echo "❌ Failed to start with PM2"
    exit 1
fi

echo ""
echo "💾 Saving PM2 process list..."
pm2 save

echo ""
echo "🔧 Setting up PM2 startup script..."
pm2 startup

echo ""
echo "✨ Setup complete!"
echo ""
echo "📊 Useful commands:"
echo "   pm2 status              - Check status"
echo "   pm2 logs ollama-tools-api - View logs"
echo "   pm2 restart ollama-tools-api - Restart"
echo "   pm2 stop ollama-tools-api - Stop"
echo "   pm2 monit               - Monitor resources"
echo ""
echo "🌐 Server running at: http://localhost:3100"
echo "📚 View endpoints: http://localhost:3100/api/endpoints"
echo "💚 Health check: http://localhost:3100/health"
echo ""
echo "🧪 Test the API:"
echo "   curl http://localhost:3100/health"
echo "   curl http://localhost:3100/api/weather/London"
echo ""
