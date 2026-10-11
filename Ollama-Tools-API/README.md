# Ollama Tools API

A small, self-hosted HTTP API that gives AI models access to live data: web search, weather, time, geolocation, crypto prices and a set of network and developer utilities. It's built to be the "tools" backend for [Ollama](https://ollama.com) bots, but anything that can make an HTTP request can use it.

It's the tools backend for [Nocturnal](https://github.com/Gigg1E/Nocturnal-ai), a Discord bot.

---

## Features

| Category | What you get |
|---|---|
| **Search** | Web and news search through [Tavily](https://tavily.com), falling back to [SerpApi](https://serpapi.com) automatically if Tavily fails |
| **Weather** | Current conditions and forecast, plus active severe-weather alerts (NWS in the US, condition-based elsewhere) |
| **Time** | Current time (UTC, local, unix), timezone lookup and the full timezone list |
| **Geolocation** | Place → coordinates, and coordinates → place |
| **Crypto** | USD price, 24h change and market cap for major coins |
| **Network** | IP lookup, DNS, ping, ASN/BGP info, MAC vendor lookup, HTTP status and latency, TLS certificate details |
| **Developer utilities** | Hashing (MD5/SHA1/SHA256/SHA512), Base64, CIDR subnet calculator, WHOIS/RDAP, CVE lookup (NVD) |
| **Phone numbers** | Validation and formatting done locally, with optional carrier and line-type details |
| **NASA** | Astronomy Picture of the Day |

Only search requires an API key. Everything else uses free public APIs or runs locally.

---

## Quick start

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone https://github.com/Gigg1E/Ollama-Tools.git
cd Ollama-Tools/Ollama-Tools-API
npm install
cp .env.example .env     # then add your API keys (see below)
npm start
```

Check that it's running:

```bash
curl http://localhost:3100/health
```

There's also a smoke-test script that calls each endpoint group:

```bash
bash test.sh
```

### API keys

| Env var | Needed for | Required? |
|---|---|---|
| `TAVILY_API_KEY` | `/api/search`, `/api/news` | **Yes, for search.** Free tier available at [tavily.com](https://tavily.com) |
| `SERPAPI_KEY` | Search fallback | Optional, recommended. Used automatically when Tavily fails |
| `NASA_API_KEY` | `/api/apod` | Optional. Falls back to `DEMO_KEY` (30 requests/hour, 50/day) |
| `NUMVERIFY_API_KEY` | Carrier and line type in `/api/phone` | Optional. Validation and formatting work without it |
| `PORT` | | Optional. Defaults to `3100` |

### Running with PM2

A PM2 config is included:

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save && pm2 startup    # start on boot
pm2 logs ollama-tools-api
```

---

## Security

**This API has no authentication**, and it listens on all network interfaces. Run it on `localhost` or a private network, next to the bot that uses it, and don't expose it to the internet. Endpoints like `/api/http-status`, `/api/ssl` and `/api/ping` make requests from your server, so an open instance lets anyone use it to probe the network it sits on.

---

## Endpoints

`GET /api/endpoints` returns a machine-readable list of everything below.

### Search
| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/search` | Body: `{ "query": "what is ollama", "num_results": 5 }` |
| `GET` | `/api/news/:query?num_results=5` | Same search, tuned for news |

### Weather, time and places
| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/weather/:location` | `London`, `Jacksonville,FL`, … |
| `GET` | `/api/weather-alerts/:location` | Active severe-weather alerts |
| `GET` | `/api/time` | Current UTC, local and unix time |
| `GET` | `/api/timezone/:zone` | e.g. `America/New_York` |
| `GET` | `/api/timezones` | All available timezones |
| `GET` | `/api/geocode/:place` | e.g. `Eiffel Tower` |
| `GET` | `/api/reverse-geocode/:lat/:lon` | e.g. `48.8584/2.2945` |

### Crypto and NASA
| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/crypto/:symbol` | `btc`, `eth`, `sol`, `doge`, `xrp`, `ada`, `ltc`, `bnb`, `matic`, `dot`, `link`, `avax`, `atom`, `near`, `shib` |
| `GET` | `/api/apod` | Astronomy Picture of the Day |

### Network
| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/ip` / `/api/ip/:ip` | Your public IP, or a specific one |
| `GET` | `/api/dns/:hostname` | DNS records |
| `GET` | `/api/ping/:host` | Ping |
| `GET` | `/api/asn/:ip` | ASN / BGP info |
| `GET` | `/api/mac/:address` | MAC vendor lookup (cached 24h) |
| `GET` | `/api/http-status?url=https://example.com` | Reachability and latency |
| `GET` | `/api/ssl/:hostname` | TLS certificate details (`?port=` optional) |

### Developer utilities
| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/hash` | `{ "text": "hello", "algorithm": "sha256" }`, using `md5`, `sha1`, `sha256` or `sha512` |
| `POST` | `/api/base64` | `{ "text": "hello", "mode": "encode" }`, using `encode` or `decode` |
| `POST` | `/api/subnet` | `{ "cidr": "192.168.1.0/24" }` |
| `GET` | `/api/whois/:domain` | RDAP domain lookup |
| `GET` | `/api/cve/:id` | e.g. `CVE-2024-12345` |
| `GET` | `/api/phone/:number` | `+15551234567`, or `5551234567?country=US` |

Errors come back as JSON with an `error` field and an appropriate HTTP status code. For detailed request and response examples, see [`API_USAGE_GUIDE.md`](API_USAGE_GUIDE.md) and [`QUICK_REFERENCE.md`](QUICK_REFERENCE.md).

---

## Using it with Ollama

Ollama supports [native tool calling](https://ollama.com/blog/tool-support). You describe the tools to the model, it replies with the calls it wants to make, you run them against this API, and you send the results back:

```javascript
const OLLAMA = 'http://localhost:11434';
const TOOLS_API = 'http://localhost:3100';

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Current weather and forecast for a location',
      parameters: {
        type: 'object',
        properties: { location: { type: 'string', description: 'City, e.g. "Austin, TX"' } },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Search the web for current information',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
];

async function runTool(name, args) {
  if (name === 'get_weather') {
    return (await fetch(`${TOOLS_API}/api/weather/${encodeURIComponent(args.location)}`)).json();
  }
  if (name === 'search_web') {
    const res = await fetch(`${TOOLS_API}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: args.query, num_results: 5 }),
    });
    return res.json();
  }
  return { error: `unknown tool ${name}` };
}

async function chat(messages, model = 'qwen3:8b') {
  for (;;) {
    const res = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({ model, messages, tools, stream: false }),
    });
    const { message } = await res.json();
    messages.push(message);
    if (!message.tool_calls?.length) return message.content;

    for (const call of message.tool_calls) {
      const result = await runTool(call.function.name, call.function.arguments);
      messages.push({ role: 'tool', content: JSON.stringify(result) });
    }
  }
}

chat([{ role: 'user', content: 'Is it going to rain in Austin tomorrow?' }]).then(console.log);
```

Any Ollama model with tool support works, for example Qwen 3, Llama 3.1+ or Mistral. The same pattern works from Python or any other language. It's just HTTP.

---

## Example responses

**`GET /api/weather/London`**
```json
{
  "location": { "name": "London", "country": "United Kingdom" },
  "current": { "temp_c": "15", "temp_f": "59", "condition": "Partly cloudy", "humidity": "76" }
}
```

**`POST /api/search`**
```json
{
  "query": "ollama ai",
  "results": [
    { "title": "Ollama", "snippet": "Get up and running with large language models.", "url": "https://ollama.com" }
  ]
}
```

**`GET /api/crypto/btc`**
```json
{ "symbol": "BTC", "id": "bitcoin", "price_usd": 67234.12, "change_24h": 1.84, "market_cap_usd": 1324000000000 }
```

---

## Troubleshooting

- **Search returns errors.** Set `TAVILY_API_KEY`, and ideally `SERPAPI_KEY` as a fallback. Every other endpoint works without keys.
- **Port already in use.** Run `PORT=3200 npm start`, or change `PORT` in `.env` or `ecosystem.config.js`.
- **Requests to outside services fail.** The API calls public services (wttr.in, NVD, CoinGecko and others), so check your firewall and internet connection.
- **PM2 doesn't start on boot.** Run `pm2 unstartup && pm2 startup && pm2 save`.
