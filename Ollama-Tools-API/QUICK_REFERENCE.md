# Quick Reference - Ollama Tools API

## 🚀 Quick Start

```bash
# Setup (first time only)
./setup.sh

# Manual start
npm start

# PM2 start
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 📡 Common API Calls

### Weather
```bash
# Current weather
curl http://localhost:3100/api/weather/Miami

# With city and state
curl http://localhost:3100/api/weather/Jacksonville,FL

# International
curl http://localhost:3100/api/weather/London
curl http://localhost:3100/api/weather/Tokyo
```

### Web Search
```bash
# Basic search
curl -X POST http://localhost:3100/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "ollama tutorial"}'

# More results
curl -X POST http://localhost:3100/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "best pizza recipe", "num_results": 10}'
```

### Location & Coordinates
```bash
# Get coordinates of a place
curl http://localhost:3100/api/geocode/Statue%20of%20Liberty

# Reverse lookup (coords to location)
curl http://localhost:3100/api/reverse-geocode/40.7128/-74.0060

# Address lookup
curl http://localhost:3100/api/geocode/1600%20Pennsylvania%20Avenue
```

### Network Tools
```bash
# Your IP info
curl http://localhost:3100/api/ip

# Lookup specific IP
curl http://localhost:3100/api/ip/8.8.8.8

# DNS lookup
curl http://localhost:3100/api/dns/github.com

# Ping test
curl http://localhost:3100/api/ping/google.com
```

### Time & Timezone
```bash
# Current time
curl http://localhost:3100/api/time

# Timezone info
curl http://localhost:3100/api/timezone/America/New_York
curl http://localhost:3100/api/timezone/Europe/London
curl http://localhost:3100/api/timezone/Asia/Tokyo

# List all timezones
curl http://localhost:3100/api/timezones
```

## 🤖 Using with Ollama

### Node.js Example
```javascript
const axios = require('axios');

async function askWithTools(question) {
  // 1. Get weather data
  const weather = await axios.get('http://localhost:3100/api/weather/Miami');
  
  // 2. Ask Ollama with context
  const prompt = `${question}\n\nCurrent weather in Miami: ${JSON.stringify(weather.data)}`;
  
  const ollama = await axios.post('http://localhost:11434/api/generate', {
    model: 'qwen3:14b',
    prompt: prompt,
    stream: false
  });
  
  return ollama.data.response;
}

// Usage
askWithTools("Should I bring an umbrella today?").then(console.log);
```

### Python Example
```python
import requests

def ask_with_tools(question):
    # Get weather
    weather = requests.get('http://localhost:3100/api/weather/Miami').json()
    
    # Ask Ollama
    prompt = f"{question}\n\nWeather data: {weather}"
    
    ollama = requests.post('http://localhost:11434/api/generate', json={
        'model': 'qwen3:14b',
        'prompt': prompt,
        'stream': False
    })
    
    return ollama.json()['response']

# Usage
print(ask_with_tools("What's the weather like?"))
```

### Bash Script Example
```bash
#!/bin/bash

# Get weather and ask Ollama
WEATHER=$(curl -s http://localhost:3100/api/weather/Jacksonville)

PROMPT="Based on this weather: $WEATHER - Should I go for a run?"

curl -s http://localhost:11434/api/generate -d "{
  \"model\": \"qwen3:14b\",
  \"prompt\": \"$PROMPT\",
  \"stream\": false
}" | jq -r '.response'
```

## 🔧 PM2 Management

```bash
# Status
pm2 status
pm2 list

# Logs
pm2 logs ollama-tools-api
pm2 logs --lines 50

# Restart/Stop
pm2 restart ollama-tools-api
pm2 stop ollama-tools-api
pm2 delete ollama-tools-api

# Monitoring
pm2 monit

# Save and restore
pm2 save
pm2 resurrect
```

## 🐛 Debugging

### Check if running
```bash
curl http://localhost:3100/health
```

### View all endpoints
```bash
curl http://localhost:3100/api/endpoints | jq
```

### Check PM2 logs
```bash
pm2 logs ollama-tools-api --err  # Errors only
pm2 logs ollama-tools-api --out  # Output only
```

### Test all endpoints
```bash
./test.sh
```

## 📊 Response Examples

### Weather Response
```json
{
  "location": {
    "name": "London",
    "country": "United Kingdom"
  },
  "current": {
    "temp_f": "59",
    "condition": "Partly cloudy",
    "humidity": "76"
  }
}
```

### Search Response
```json
{
  "query": "ollama ai",
  "results": [
    {
      "title": "Ollama",
      "snippet": "Get up and running...",
      "url": "https://ollama.com"
    }
  ],
  "count": 5
}
```

### Geocode Response
```json
{
  "location": "Eiffel Tower, Paris, France",
  "latitude": 48.8584,
  "longitude": 2.2945
}
```

## ⚡ Tips

- **Cache responses** for frequently accessed data
- **Use PM2** for auto-restart and monitoring
- **Set environment variables** for configuration
- **Add rate limiting** if making public
- **Enable CORS** if calling from browser

## 🔗 Integration Ideas

- Discord bots with real-time data
- Slack bots for team updates
- CLI tools with location awareness
- Automated scripts with network checks
- AI assistants with web access
- Home automation with weather triggers

---

**API Base:** `http://localhost:3100`  
**Default Port:** `3100`  
**Process Name:** `ollama-tools-api`
