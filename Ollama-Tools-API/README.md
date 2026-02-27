# Ollama Tools API

A lightweight utility API that provides real-world data access for AI models (Ollama, etc.). Perfect for bots and automation projects.

## 🚀 Features

- **Web Search** - DuckDuckGo search results
- **Weather** - Current weather and forecasts
- **Timezones** - Timezone information and conversions
- **Geolocation** - Coordinates lookup and reverse geocoding
- **IP Tools** - IP lookup, DNS resolution, ping tests
- **Time** - UTC and local time information

## 📦 Installation

```bash
# Clone or create the directory
mkdir ollama-tools-api
cd ollama-tools-api

# Install dependencies
npm install

# Start the server
npm start
```

## 🔧 PM2 Setup (Auto-start on boot)

```bash
# Install PM2 globally if you haven't
npm install -g pm2

# Start with PM2
pm2 start server.js --name ollama-tools

# Save the process list
pm2 save

# Generate startup script (run on boot)
pm2 startup

# Check status
pm2 status
pm2 logs ollama-tools
```

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

### Web Search
```bash
POST /api/search
Body: {
  "query": "what is ollama",
  "num_results": 5
}
```

### Weather
```bash
GET /api/weather/London
GET /api/weather/Jacksonville,FL
```

### Timezone
```bash
GET /api/timezone/America/New_York
GET /api/timezones  # List all available timezones
```

### Geolocation
```bash
GET /api/geocode/Eiffel Tower
GET /api/reverse-geocode/48.8584/2.2945
```

### IP & Network Tools
```bash
GET /api/ip                    # Your IP info
GET /api/ip/8.8.8.8           # Lookup specific IP
GET /api/dns/google.com        # DNS lookup
GET /api/ping/google.com       # Ping test
```

### Utilities
```bash
GET /api/time                  # Current time
GET /api/endpoints             # List all endpoints
```

## 🤖 Using with Ollama

### Example 1: Simple Curl Test
```bash
# Test the API
curl http://localhost:3100/api/weather/Miami

# Search example
curl -X POST http://localhost:3100/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "best pizza recipe", "num_results": 3}'
```

### Example 2: Node.js Bot Integration
```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3100';

async function askWithTools(prompt) {
  // Your Ollama call here
  const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
    model: 'qwen3:14b',
    prompt: prompt,
    stream: false
  });
  
  // If AI needs weather, call the tools API
  if (ollamaResponse.data.includes('weather')) {
    const weather = await axios.get(`${API_BASE}/api/weather/Jacksonville`);
    console.log(weather.data);
  }
}
```

### Example 3: Python Bot
```python
import requests

API_BASE = "http://localhost:3100"

def get_weather(location):
    response = requests.get(f"{API_BASE}/api/weather/{location}")
    return response.json()

def search_web(query):
    response = requests.post(f"{API_BASE}/api/search", 
                           json={"query": query, "num_results": 5})
    return response.json()

# Use in your Ollama bot
weather = get_weather("New York")
print(f"Temperature: {weather['current']['temp_f']}°F")
```

### Example 4: Discord Bot Integration
```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!weather')) {
    const location = message.content.split(' ')[1] || 'London';
    
    try {
      const weather = await axios.get(`http://localhost:3100/api/weather/${location}`);
      const w = weather.data.current;
      
      message.reply(
        `🌤️ Weather in ${location}:\n` +
        `Temperature: ${w.temp_f}°F (feels like ${w.feels_like_f}°F)\n` +
        `Condition: ${w.condition}\n` +
        `Humidity: ${w.humidity}%`
      );
    } catch (error) {
      message.reply('Could not fetch weather data.');
    }
  }
});

client.login('YOUR_BOT_TOKEN');
```

## 🔐 Configuration

You can customize the port in `server.js` or use environment variables:

```bash
# Default port is 3100
PORT=3100 npm start

# Or with PM2
PORT=3200 pm2 start server.js --name ollama-tools
```

## 🛠️ Advanced Usage

### Function Calling with Ollama

Create a wrapper that lets Ollama "call" these endpoints:

```javascript
const tools = {
  search: async (query) => {
    const res = await axios.post('http://localhost:3100/api/search', 
      { query, num_results: 5 });
    return res.data.results;
  },
  
  weather: async (location) => {
    const res = await axios.get(`http://localhost:3100/api/weather/${location}`);
    return res.data;
  },
  
  locate: async (place) => {
    const res = await axios.get(`http://localhost:3100/api/geocode/${place}`);
    return res.data;
  }
};

// Use in your Ollama prompts
async function aiWithTools(prompt) {
  // First, ask Ollama what it needs
  let response = await callOllama(prompt);
  
  // If it mentions needing to search
  if (response.includes('[SEARCH:')) {
    const query = extractQuery(response);
    const results = await tools.search(query);
    
    // Feed results back to Ollama
    response = await callOllama(
      `${prompt}\n\nSearch results: ${JSON.stringify(results)}\n\nNow answer:`
    );
  }
  
  return response;
}
```

## 📝 Notes

- **Rate Limits**: Some free APIs have rate limits. Add caching if needed.
- **Error Handling**: The API returns errors with appropriate status codes.
- **CORS**: Not enabled by default. Add if needed for browser access.
- **API Keys**: All endpoints use free services, no keys required.

## 🔄 Updating & Maintenance

```bash
# Update dependencies
npm update

# Restart with PM2
pm2 restart ollama-tools

# View logs
pm2 logs ollama-tools

# Monitor
pm2 monit
```

## 🚨 Troubleshooting

### Port already in use
```bash
# Find process using port 3100
lsof -i :3100
# Or change port in server.js or env variable
PORT=3200 npm start
```

### PM2 not starting on boot
```bash
# Re-generate startup script
pm2 unstartup
pm2 startup
pm2 save
```

### Network requests failing
Check your firewall and internet connection. The API uses external services.

## 📚 API Response Examples

**Weather:**
```json
{
  "location": { "name": "London", "country": "United Kingdom" },
  "current": {
    "temp_c": "15",
    "temp_f": "59",
    "condition": "Partly cloudy",
    "humidity": "76"
  }
}
```

**Search:**
```json
{
  "query": "ollama ai",
  "results": [
    {
      "title": "Ollama",
      "snippet": "Get up and running with large language models.",
      "url": "https://ollama.com"
    }
  ]
}
```

**IP Lookup:**
```json
{
  "ip": "8.8.8.8",
  "country": "United States",
  "city": "Mountain View",
  "latitude": 37.386,
  "longitude": -122.0838,
  "isp": "Google LLC"
}
```

## 🎯 Use Cases

- **Chatbots** - Give your bots real-world knowledge
- **Automation** - Trigger actions based on weather, time, etc.
- **Data Collection** - Gather information for analysis
- **Testing** - Mock external API calls
- **Monitoring** - Track IP addresses and network status

---

**Built for use with Ollama and other local AI models** 🦙
