# Ollama Tools API - Windows 11 Setup

## 📦 Quick Start for Windows

### 1. Prerequisites

Make sure you have Node.js installed:
```powershell
# Check if Node.js is installed
node --version
npm --version
```

If not installed, download from: https://nodejs.org/ (LTS version recommended)

### 2. Extract and Setup

```powershell
# Navigate to the extracted folder
cd ollama-tools-api

# Install dependencies
npm install

# Install PM2 globally (run PowerShell as Administrator)
npm install -g pm2
npm install -g pm2-windows-startup

# Configure PM2 for Windows startup
pm2-startup install
```

### 3. Start the API

```powershell
# Start with PM2
pm2 start ecosystem.config.js

# Save the process list
pm2 save

# Verify it's running
pm2 status
```

### 4. Test It

```powershell
# Test in browser or PowerShell
curl http://localhost:3100/health

# Or open in browser:
# http://localhost:3100/health
# http://localhost:3100/api/endpoints
```

## 🔧 Windows-Specific Commands

### PM2 Management
```powershell
# View status
pm2 status
pm2 list

# View logs
pm2 logs ollama-tools-api

# Restart
pm2 restart ollama-tools-api

# Stop
pm2 stop ollama-tools-api

# Remove from PM2
pm2 delete ollama-tools-api

# Monitor (real-time)
pm2 monit
```

### Testing Endpoints (PowerShell)

```powershell
# Health check
Invoke-WebRequest -Uri http://localhost:3100/health | Select-Object -Expand Content

# Weather
Invoke-WebRequest -Uri http://localhost:3100/api/weather/Miami | Select-Object -Expand Content

# Search (POST request)
$body = @{
    query = "test search"
    num_results = 5
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3100/api/search -Method POST -Body $body -ContentType "application/json" | Select-Object -Expand Content
```

### Or use curl (if installed)
```powershell
curl http://localhost:3100/health
curl http://localhost:3100/api/weather/London
```

## 🚀 Auto-Start on Windows Boot

PM2 with `pm2-windows-startup` will automatically start your API when Windows boots.

To verify:
```powershell
# Check PM2 startup configuration
pm2 startup
pm2 save
```

## 🐛 Troubleshooting

### Port Already in Use
```powershell
# Find what's using port 3100
netstat -ano | findstr :3100

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Or change the port in server.js or use environment variable
$env:PORT=3200; npm start
```

### PM2 Not Found After Install
```powershell
# Restart PowerShell or add to PATH manually
# Or reinstall with:
npm install -g pm2 --force
```

### Permission Errors
Run PowerShell as Administrator for PM2 installation and startup configuration.

### Windows Firewall
If you can't access from other devices on your network, add a firewall rule:
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Ollama Tools API" -Direction Inbound -LocalPort 3100 -Protocol TCP -Action Allow
```

## 📝 Notes for Windows

1. **Line Endings**: The .sh scripts won't run directly on Windows, but they're included for reference or if you use WSL/Git Bash

2. **PM2 on Windows**: Works great but uses `pm2-windows-startup` instead of the Linux startup script

3. **Running Scripts**: Use PowerShell or Command Prompt instead of bash

4. **Logs Location**: PM2 logs are in `%USERPROFILE%\.pm2\logs\`

5. **Node.js Version**: Use LTS version (18.x or 20.x recommended)

## 🎯 Quick Test Commands

```powershell
# Test all endpoints quickly
curl http://localhost:3100/health
curl http://localhost:3100/api/time
curl http://localhost:3100/api/weather/Chicago
curl http://localhost:3100/api/ip
curl http://localhost:3100/api/geocode/Statue%20of%20Liberty
```

## 🔗 Using with Ollama on Windows

Make sure Ollama is running on `http://localhost:11434`

```powershell
# Test Ollama
curl http://localhost:11434/api/tags

# Run the example integration
node example.js
```

## ⚡ Performance Tips

- Use Node.js LTS version for best stability
- PM2 cluster mode works on Windows for better performance
- Monitor with `pm2 monit` to see resource usage
- Check Windows Task Manager for Node.js processes

---

**Default API URL**: http://localhost:3100  
**Default Ollama URL**: http://localhost:11434  
**PM2 Logs**: `%USERPROFILE%\.pm2\logs\`
