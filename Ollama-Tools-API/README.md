# Ollama Tools API

A lightweight utility API that provides real-world data access for AI models (Ollama, etc.). Perfect for bots and automation projects.

## 🚀 Features

- **Web Search & News** — Tavily API, with automatic fallback to SerpApi if Tavily fails
- **Weather** — current conditions, forecast, and active severe-weather alerts
- **Timezones** — lookup by name and a full list of available timezones
- **Geolocation** — forward geocoding (place → coordinates) and reverse (coordinates → place)
- **IP & Network Diagnostics** — IP lookup, DNS resolution, ping, ASN/BGP info, MAC address vendor lookup, HTTP status/latency check, TLS/SSL certificate check
- **Phone Numbers** — validation, formatting, type, and country; optional carrier/line-type enrichment
- **Security / Dev Utilities** — hashing (MD5/SHA1/SHA256/SHA512), Base64 encode/decode, CIDR subnet calculator, WHOIS/RDAP domain lookup, CVE vulnerability lookup
- **Crypto Prices** — current USD price, 24h change, and market cap for major coins
- **NASA APOD** — Astronomy Picture of the Day
- **Time** — current UTC, local, and unix time

## 📦 Installation

```bash
# Clone or create the directory
mkdir ollama-tools-api
cd ollama-tools-api

# Install dependencies
npm install

# Copy the env template and fill in what you need (see API Keys below)
cp .env.example .env

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

### Web Search & News
```bash
POST /api/search
Body: {
  "query": "what is ollama",
  "num_results": 5
}
```
Tries Tavily first; if that fails for any reason (rate limit, quota, network error), it automatically retries with SerpApi.

```bash
GET /api/news/london%20flooding?num_results=5
```
Same search, tagged as a news query.

### Weather
```bash
GET /api/weather/London
GET /api/weather/Jacksonville,FL
```

```bash
GET /api/weather-alerts/Miami,FL
```
Active severe weather alerts — NWS for US locations, a condition-based fallback (via wttr.in) elsewhere.

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
GET /api/ip                              # Your IP info
GET /api/ip/8.8.8.8                      # Lookup specific IP
GET /api/dns/google.com                  # DNS lookup
GET /api/ping/google.com                 # Ping test
GET /api/asn/8.8.8.8                     # ASN / BGP info for an IP
GET /api/mac/00:1A:2B:3C:4D:5E           # MAC address vendor lookup (cached 24h)
GET /api/http-status?url=https://example.com  # Reachability + latency
GET /api/ssl/example.com                 # TLS certificate details (?port= optional)
```

### Phone Numbers
```bash
GET /api/phone/+15551234567
GET /api/phone/5551234567?country=US
```
Validation, formatting (international/national/E.164), country, and number type, all done locally. If `NUMVERIFY_API_KEY` is configured, the response is enriched with carrier and line-type info.

### Security / Dev Utilities
```bash
POST /api/hash
Body: { "text": "hello", "algorithm": "sha256" }   # md5 | sha1 | sha256 | sha512

POST /api/base64
Body: { "text": "hello", "mode": "encode" }        # encode | decode

POST /api/subnet
Body: { "cidr": "192.168.1.0/24" }

GET /api/whois/example.com       # RDAP domain lookup
GET /api/cve/CVE-2024-12345      # Vulnerability details from NVD
```

### Crypto
```bash
GET /api/crypto/btc   # also: eth, ltc, doge, sol, ada, xrp, bnb, matic, dot, link, avax, atom, near, shib
```

### NASA
```bash
GET /api/apod   # Astronomy Picture of the Day
```

### Utilities
```bash
GET /api/time                  # Current time (UTC, local, unix)
GET /api/endpoints             # Machine-readable list of every endpoint
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

Copy `.env.example` to `.env` and set `PORT` plus whichever API keys you need (see below).

```bash
# Default port is 3100
PORT=3100 npm start

# Or with PM2
PORT=3200 pm2 start server.js --name ollama-tools
```

## 🔑 API Keys

| Feature | Env var | Required? |
|---|---|---|
| Web search / news | `TAVILY_API_KEY` | **Yes** — search and news endpoints fail without it |
| Search fallback | `SERPAPI_KEY` | Optional, but recommended — used automatically if Tavily fails |
| NASA APOD | `NASA_API_KEY` | Optional — falls back to `DEMO_KEY` (rate-limited: 30/hr, 50/day) |
| Phone carrier/line-type enrichment | `NUMVERIFY_API_KEY` | Optional — phone validation and formatting still work without it, just without carrier/line-type detail |

Everything else — weather, weather alerts, timezones, geolocation, IP/DNS/ping, ASN, MAC lookup, hashing, Base64, subnet calculator, WHOIS, CVE lookup, crypto prices, SSL check, and HTTP status check — uses free, keyless public APIs.

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

- **Rate Limits**: Some free APIs have rate limits (see the API Keys table for Tavily/SerpApi/NASA specifics). Add caching if needed.
- **Error Handling**: The API returns errors with appropriate status codes.
- **CORS**: Not enabled by default. Add if needed for browser access.
- **API Keys**: Most endpoints are keyless. Search (`/api/search`, `/api/news`) needs `TAVILY_API_KEY` to work at all — everything else works out of the box, with a few optional keys that add extra detail (see the table above).

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

### Search returning errors
`/api/search` and `/api/news` need `TAVILY_API_KEY` set — without it (and without `SERPAPI_KEY` as a fallback) those two endpoints will fail. Every other endpoint works without any key.

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

**Crypto Price:**
```json
{
  "symbol": "BTC",
  "id": "bitcoin",
  "price_usd": 67234.12,
  "change_24h": 1.84,
  "market_cap_usd": 1324000000000
}
```

## 🎯 Use Cases

- **Chatbots** - Give your bots real-world knowledge
- **Automation** - Trigger actions based on weather, time, etc.
- **Data Collection** - Gather information for analysis
- **Testing** - Mock external API calls
- **Monitoring** - Track IP addresses, network status, SSL cert expiry, and site uptime

---

**Built for use with Ollama and other local AI models** 🦙
