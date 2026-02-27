require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns').promises;
const { execSync } = require('child_process');
const { PhoneNumberUtil, PhoneNumberFormat } = require('google-libphonenumber');
const phoneUtil = PhoneNumberUtil.getInstance();
const crypto = require('crypto');
const tls = require('tls');

const app = express();
const PORT = process.env.PORT || 3100;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== WEB SEARCH ====================
app.post('/api/search', async (req, res) => {
  try {
    const { query, num_results = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    // Using DuckDuckGo HTML search (no API key needed)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.result').slice(0, num_results).each((i, elem) => {
      const title = $(elem).find('.result__title').text().trim();
      const snippet = $(elem).find('.result__snippet').text().trim();
      const url = $(elem).find('.result__url').text().trim();
      
      if (title && url) {
        results.push({ title, snippet, url });
      }
    });

    res.json({
      query,
      results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Search failed', 
      details: error.message 
    });
  }
});

// ==================== WEATHER ====================
app.get('/api/weather/:location', async (req, res) => {
  try {
    const { location } = req.params;
    
    // Using wttr.in - free weather service
    const weatherUrl = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
    const response = await axios.get(weatherUrl);
    const data = response.data;

    const current = data.current_condition[0];
    const forecast = data.weather[0];

    res.json({
      location: data.nearest_area[0],
      current: {
        temp_c: current.temp_C,
        temp_f: current.temp_F,
        feels_like_c: current.FeelsLikeC,
        feels_like_f: current.FeelsLikeF,
        condition: current.weatherDesc[0].value,
        humidity: current.humidity,
        wind_mph: current.windspeedMiles,
        wind_kph: current.windspeedKmph,
        precipitation_mm: current.precipMM
      },
      forecast: {
        max_temp_c: forecast.maxtempC,
        max_temp_f: forecast.maxtempF,
        min_temp_c: forecast.mintempC,
        min_temp_f: forecast.mintempF,
        sunrise: forecast.astronomy[0].sunrise,
        sunset: forecast.astronomy[0].sunset
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Weather lookup failed', 
      details: error.message 
    });
  }
});

// ==================== TIMEZONE ====================
app.get('/api/timezone/:location', async (req, res) => {
  try {
    const { location } = req.params;
    
    // Using WorldTimeAPI
    const timezoneUrl = `http://worldtimeapi.org/api/timezone/${encodeURIComponent(location)}`;
    const response = await axios.get(timezoneUrl);
    
    res.json({
      timezone: response.data.timezone,
      datetime: response.data.datetime,
      utc_offset: response.data.utc_offset,
      day_of_week: response.data.day_of_week,
      day_of_year: response.data.day_of_year,
      week_number: response.data.week_number,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Timezone lookup failed', 
      details: error.message 
    });
  }
});

// Get all available timezones
app.get('/api/timezones', async (req, res) => {
  try {
    const response = await axios.get('http://worldtimeapi.org/api/timezone');
    res.json({ timezones: response.data });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch timezones', 
      details: error.message 
    });
  }
});

// ==================== GEOLOCATION ====================
app.get('/api/geocode/:location', async (req, res) => {
  try {
    const { location } = req.params;
    
    // Using Nominatim (OpenStreetMap)
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const response = await axios.get(geocodeUrl, {
      headers: { 'User-Agent': 'OllamaToolsAPI/1.0' }
    });

    if (response.data.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const result = response.data[0];
    
    res.json({
      location: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      type: result.type,
      importance: result.importance,
      bounding_box: result.boundingbox,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Geocoding failed', 
      details: error.message 
    });
  }
});

// Reverse geocode (coordinates to location)
app.get('/api/reverse-geocode/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    
    const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const response = await axios.get(geocodeUrl, {
      headers: { 'User-Agent': 'OllamaToolsAPI/1.0' }
    });

    res.json({
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      location: response.data.display_name,
      address: response.data.address,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Reverse geocoding failed', 
      details: error.message 
    });
  }
});

// ==================== IP LOOKUP ====================
app.get('/api/ip/:ip?', async (req, res) => {
  try {
    const ip = req.params.ip || req.ip || req.connection.remoteAddress;
    
    // Using ip-api.com (free, no key needed)
    const ipUrl = `http://ip-api.com/json/${ip}`;
    const response = await axios.get(ipUrl);
    
    if (response.data.status === 'fail') {
      return res.status(400).json({ error: response.data.message });
    }

    res.json({
      ip: response.data.query,
      country: response.data.country,
      country_code: response.data.countryCode,
      region: response.data.regionName,
      city: response.data.city,
      zip: response.data.zip,
      latitude: response.data.lat,
      longitude: response.data.lon,
      timezone: response.data.timezone,
      isp: response.data.isp,
      org: response.data.org,
      as: response.data.as,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'IP lookup failed', 
      details: error.message 
    });
  }
});

// ==================== PHONE LOOKUP ====================
app.get('/api/phone/:number', async (req, res) => {
  const input = req.params.number;
  const defaultCountry = (req.query.country || 'US').toUpperCase();

  const NUMBER_TYPE_MAP = {
    0: 'FIXED_LINE', 1: 'MOBILE', 2: 'FIXED_LINE_OR_MOBILE',
    3: 'TOLL_FREE', 4: 'PREMIUM_RATE', 5: 'SHARED_COST',
    6: 'VOIP', 7: 'PERSONAL_NUMBER', 8: 'PAGER',
    9: 'UAN', 10: 'VOICEMAIL', '-1': 'UNKNOWN'
  };

  let parsed;
  try {
    parsed = phoneUtil.parseAndKeepRawInput(input, defaultCountry);
  } catch (e) {
    return res.status(400).json({
      valid: false,
      input,
      error: 'Cannot parse number',
      details: e.message,
      timestamp: new Date().toISOString()
    });
  }

  const typeCode = phoneUtil.getNumberType(parsed);

  const result = {
    input,
    valid: phoneUtil.isValidNumber(parsed),
    possible: phoneUtil.isPossibleNumber(parsed),
    international_format: phoneUtil.format(parsed, PhoneNumberFormat.INTERNATIONAL),
    national_format: phoneUtil.format(parsed, PhoneNumberFormat.NATIONAL),
    e164: phoneUtil.format(parsed, PhoneNumberFormat.E164),
    country_code: String(parsed.getCountryCode()),
    country: phoneUtil.getRegionCodeForNumber(parsed) || null,
    number_type: NUMBER_TYPE_MAP[typeCode] || 'UNKNOWN',
    carrier: null,
    location: null,
    source: 'local',
    timestamp: new Date().toISOString()
  };

  const numverifyKey = process.env.NUMVERIFY_API_KEY;
  if (numverifyKey) {
    try {
      const e164digits = result.e164.replace('+', '');
      const nvUrl = `http://apilayer.net/api/validate?access_key=${numverifyKey}&number=${e164digits}&format=1`;
      const nvRes = await axios.get(nvUrl, { timeout: 5000 });
      if (nvRes.data && nvRes.data.valid !== undefined) {
        result.carrier = nvRes.data.carrier || null;
        result.location = nvRes.data.location || null;
        if (nvRes.data.line_type) result.number_type = nvRes.data.line_type.toUpperCase();
        result.source = 'local+numverify';
      }
    } catch (_) {
      // Silently fall back to local-only result
    }
  }

  res.json(result);
});

// DNS lookup
app.get('/api/dns/:hostname', async (req, res) => {
  try {
    const { hostname } = req.params;
    
    const [ipv4, ipv6] = await Promise.allSettled([
      dns.resolve4(hostname),
      dns.resolve6(hostname)
    ]);

    res.json({
      hostname,
      ipv4: ipv4.status === 'fulfilled' ? ipv4.value : [],
      ipv6: ipv6.status === 'fulfilled' ? ipv6.value : [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'DNS lookup failed', 
      details: error.message 
    });
  }
});

// Ping test
app.get('/api/ping/:host', async (req, res) => {
  try {
    const { host } = req.params;
    
    // Execute ping command (cross-platform)
    const isWindows = process.platform === 'win32';
    const pingCmd = isWindows 
      ? `ping -n 4 ${host}` 
      : `ping -c 4 ${host}`;
    
    const output = execSync(pingCmd, { encoding: 'utf-8', timeout: 10000 });
    
    // Parse ping results (basic)
    const alive = !output.toLowerCase().includes('100% packet loss');
    
    res.json({
      host,
      alive,
      output: output.split('\n').filter(line => line.trim()),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      host: req.params.host,
      alive: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== WEATHER ALERTS ====================
app.get('/api/weather-alerts/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const alerts = [];

    // Geocode location to get lat/lon
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const geoResponse = await axios.get(geocodeUrl, {
      headers: { 'User-Agent': 'OllamaToolsAPI/1.0' },
      timeout: 8000,
    });

    if (geoResponse.data.length === 0) {
      return res.status(404).json({ error: 'Location not found', alerts: [] });
    }

    const { lat, lon } = geoResponse.data[0];

    // Try NWS API (US locations only)
    try {
      const nwsResponse = await axios.get(
        `https://api.weather.gov/alerts/active?point=${lat},${lon}`,
        {
          headers: { 'User-Agent': 'OllamaToolsAPI/1.0 (webhook-notifications)' },
          timeout: 8000,
        }
      );

      for (const feature of (nwsResponse.data.features || [])) {
        const props = feature.properties;
        alerts.push({
          id: props.id,
          title: props.event,
          severity: props.severity,
          urgency: props.urgency,
          description: props.description ? props.description.slice(0, 500) : '',
          effective: props.effective,
          expires: props.expires,
        });
      }
    } catch (nwsErr) {
      // NWS unavailable (non-US location or network error) — fall through to wttr.in fallback
    }

    // wttr.in fallback: flag severe condition codes for non-US or when NWS returns nothing
    if (alerts.length === 0) {
      try {
        const wttrResponse = await axios.get(
          `https://wttr.in/${encodeURIComponent(location)}?format=j1`,
          { timeout: 5000 }
        );
        const condition = wttrResponse.data?.current_condition?.[0]?.weatherDesc?.[0]?.value || '';
        const stormKeywords = ['thunder', 'storm', 'tornado', 'blizzard', 'hurricane', 'typhoon'];

        if (stormKeywords.some(kw => condition.toLowerCase().includes(kw))) {
          alerts.push({
            id: `wttr-${Date.now()}`,
            title: `Severe Weather: ${condition}`,
            severity: 'Severe',
            urgency: 'Immediate',
            description: `Current conditions in ${location}: ${condition}`,
            effective: new Date().toISOString(),
            expires: null,
          });
        }
      } catch (wttrErr) {
        // ignore secondary fallback error
      }
    }

    res.json({ location, alerts, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Weather alerts lookup failed', details: error.message });
  }
});

// ==================== NASA APOD ====================
app.get('/api/apod', async (req, res) => {
  try {
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    const response = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}`);
    const { title, date, explanation, url, hdurl, media_type } = response.data;
    res.json({ title, date, explanation, url, hdurl, media_type, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'APOD fetch failed', details: error.message });
  }
});

// ==================== NEWS SEARCH ====================
app.get('/api/news/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const num_results = parseInt(req.query.num_results) || 5;

    // DuckDuckGo news tab via HTML scraping
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' news')}&ia=news`;
    const response = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.result').slice(0, num_results).each((i, elem) => {
      const title = $(elem).find('.result__title').text().trim();
      const snippet = $(elem).find('.result__snippet').text().trim();
      const url = $(elem).find('.result__url').text().trim();

      if (title && url) {
        results.push({ title, snippet, url });
      }
    });

    res.json({ query, results, count: results.length, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'News search failed', details: error.message });
  }
});

// ==================== UTILITY ENDPOINTS ====================
app.get('/api/time', (req, res) => {
  const now = new Date();
  res.json({
    utc: now.toISOString(),
    unix: Math.floor(now.getTime() / 1000),
    local: now.toLocaleString(),
    timestamp: now.toISOString()
  });
});

// List all available endpoints
app.get('/api/endpoints', (req, res) => {
  res.json({
    endpoints: [
      { method: 'GET', path: '/health', description: 'Health check' },
      { method: 'POST', path: '/api/search', description: 'Web search', body: { query: 'string', num_results: 'number (optional)' } },
      { method: 'GET', path: '/api/weather/:location', description: 'Get weather for location' },
      { method: 'GET', path: '/api/timezone/:location', description: 'Get timezone info' },
      { method: 'GET', path: '/api/timezones', description: 'List all timezones' },
      { method: 'GET', path: '/api/geocode/:location', description: 'Get coordinates for location' },
      { method: 'GET', path: '/api/reverse-geocode/:lat/:lon', description: 'Get location from coordinates' },
      { method: 'GET', path: '/api/ip/:ip?', description: 'IP lookup (optional IP param, defaults to requester)' },
      { method: 'GET', path: '/api/phone/:number', description: 'Phone number validation, formatting, country, and type. Optional ?country=US hint for local numbers. Enriched with carrier/line type if NUMVERIFY_API_KEY is configured.' },
      { method: 'GET', path: '/api/dns/:hostname', description: 'DNS lookup' },
      { method: 'GET', path: '/api/ping/:host', description: 'Ping test' },
      { method: 'GET', path: '/api/weather-alerts/:location', description: 'Get active weather alerts for location (NWS for US, wttr.in fallback)' },
      { method: 'GET', path: '/api/apod', description: 'NASA Astronomy Picture of the Day' },
      { method: 'GET', path: '/api/news/:query', description: 'News search via DuckDuckGo', query: { num_results: 'number (optional)' } },
      { method: 'GET', path: '/api/time', description: 'Get current time' },
      { method: 'POST', path: '/api/hash', description: 'Hash text (md5/sha1/sha256/sha512)', body: { text: 'string', algorithm: 'string (optional, default sha256)' } },
      { method: 'POST', path: '/api/base64', description: 'Base64 encode or decode', body: { text: 'string', mode: 'encode|decode (optional, default encode)' } },
      { method: 'POST', path: '/api/subnet', description: 'CIDR subnet calculator', body: { cidr: 'string (e.g. 192.168.1.0/24)' } },
      { method: 'GET', path: '/api/whois/:domain', description: 'WHOIS/RDAP domain lookup' },
      { method: 'GET', path: '/api/asn/:ip', description: 'ASN/BGP info for an IP address' },
      { method: 'GET', path: '/api/crypto/:symbol', description: 'Cryptocurrency price (BTC, ETH, etc.)' },
      { method: 'GET', path: '/api/cve/:id', description: 'CVE vulnerability details from NVD' },
      { method: 'GET', path: '/api/ssl/:hostname', description: 'TLS/SSL certificate info', query: { port: 'number (optional, default 443)' } },
      { method: 'GET', path: '/api/http-status', description: 'Check if a URL is reachable', query: { url: 'string (required)' } },
      { method: 'GET', path: '/api/endpoints', description: 'List all endpoints' }
    ]
  });
});

// ==================== HASH ====================
app.post('/api/hash', (req, res) => {
  const { text, algorithm = 'sha256' } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const valid = ['md5', 'sha1', 'sha256', 'sha512'];
  if (!valid.includes(algorithm)) return res.status(400).json({ error: 'invalid algorithm' });
  const hash = crypto.createHash(algorithm).update(text).digest('hex');
  res.json({ hash, algorithm, input_length: text.length, timestamp: new Date().toISOString() });
});

// ==================== BASE64 ====================
app.post('/api/base64', (req, res) => {
  const { text, mode = 'encode' } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  if (mode === 'encode') {
    res.json({ result: Buffer.from(text).toString('base64'), mode });
  } else if (mode === 'decode') {
    try { res.json({ result: Buffer.from(text, 'base64').toString('utf8'), mode }); }
    catch { res.status(400).json({ error: 'invalid base64 string' }); }
  } else { res.status(400).json({ error: 'mode must be encode or decode' }); }
});

// ==================== SUBNET CALCULATOR ====================
app.post('/api/subnet', (req, res) => {
  const { cidr } = req.body;
  if (!cidr) return res.status(400).json({ error: 'cidr required' });
  try {
    const [ip, bits] = cidr.split('/');
    const prefix = parseInt(bits);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return res.status(400).json({ error: 'invalid CIDR' });
    const toInt = ip => ip.split('.').reduce((a, o) => (a << 8) + parseInt(o), 0) >>> 0;
    const toIp = n => [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
    const ipInt = toInt(ip);
    const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
    const network = (ipInt & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const hosts = prefix >= 31 ? Math.pow(2, 32 - prefix) : Math.pow(2, 32 - prefix) - 2;
    res.json({
      cidr, network: toIp(network), broadcast: toIp(broadcast),
      mask: toIp(mask), prefix,
      first_host: prefix >= 31 ? toIp(network) : toIp(network + 1),
      last_host: prefix >= 31 ? toIp(broadcast) : toIp(broadcast - 1),
      usable_hosts: Math.max(0, hosts), timestamp: new Date().toISOString()
    });
  } catch (e) { res.status(400).json({ error: 'subnet calculation failed', details: e.message }); }
});

// ==================== WHOIS (RDAP) ====================
app.get('/api/whois/:domain', async (req, res) => {
  try {
    const r = await axios.get(`https://rdap.org/domain/${req.params.domain}`, { timeout: 8000, headers: { 'Accept': 'application/json' } });
    const d = r.data;
    const find = (action) => d.events?.find(e => e.eventAction === action)?.eventDate;
    const registrar = d.entities?.flatMap(e => e.roles?.includes('registrar') ? [e] : [])
      .flatMap(e => e.vcardArray?.[1] || []).find(v => v[0] === 'fn')?.[3];
    res.json({
      domain: d.ldhName || req.params.domain, status: d.status,
      registrar, created: find('registration'), expires: find('expiration'),
      updated: find('last changed'), nameservers: d.nameservers?.map(n => n.ldhName),
      timestamp: new Date().toISOString()
    });
  } catch (e) { res.status(500).json({ error: 'WHOIS lookup failed', details: e.message }); }
});

// ==================== ASN LOOKUP ====================
app.get('/api/asn/:ip', async (req, res) => {
  try {
    const r = await axios.get(`https://api.bgpview.io/ip/${req.params.ip}`, { timeout: 8000 });
    const pref = r.data?.data?.prefixes?.[0];
    res.json({
      ip: req.params.ip, asn: pref?.asn?.asn, asn_name: pref?.asn?.name,
      description: pref?.asn?.description, country: pref?.asn?.country_code,
      prefix: pref?.prefix, rir: r.data?.data?.rir_allocation?.rir_name,
      timestamp: new Date().toISOString()
    });
  } catch (e) { res.status(500).json({ error: 'ASN lookup failed', details: e.message }); }
});

// ==================== CRYPTO PRICE ====================
const COIN_IDS = { btc:'bitcoin',eth:'ethereum',ltc:'litecoin',doge:'dogecoin',
  sol:'solana',ada:'cardano',xrp:'ripple',bnb:'binancecoin',
  matic:'matic-network',dot:'polkadot',link:'chainlink',avax:'avalanche-2',
  atom:'cosmos',near:'near',shib:'shiba-inu' };

app.get('/api/crypto/:symbol', async (req, res) => {
  const sym = req.params.symbol.toLowerCase();
  const id = COIN_IDS[sym] || sym;
  try {
    const r = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids: id, vs_currencies: 'usd', include_24hr_change: true, include_market_cap: true },
      timeout: 8000
    });
    const data = r.data[id];
    if (!data) return res.status(404).json({ error: `Coin not found: ${sym}` });
    res.json({ symbol: sym.toUpperCase(), id, price_usd: data.usd,
      change_24h: data.usd_24h_change, market_cap_usd: data.usd_market_cap,
      timestamp: new Date().toISOString() });
  } catch (e) { res.status(500).json({ error: 'Crypto price fetch failed', details: e.message }); }
});

// ==================== CVE LOOKUP ====================
app.get('/api/cve/:id', async (req, res) => {
  const cveId = req.params.id.toUpperCase();
  try {
    const r = await axios.get(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`, { timeout: 10000 });
    const vuln = r.data.vulnerabilities?.[0]?.cve;
    if (!vuln) return res.status(404).json({ error: 'CVE not found' });
    const desc = vuln.descriptions?.find(d => d.lang === 'en')?.value || '';
    const cvss = vuln.metrics?.cvssMetricV31?.[0]?.cvssData || vuln.metrics?.cvssMetricV30?.[0]?.cvssData || vuln.metrics?.cvssMetricV2?.[0]?.cvssData;
    res.json({
      id: cveId, description: desc.substring(0, 800),
      severity: cvss?.baseSeverity, score: cvss?.baseScore,
      published: vuln.published, modified: vuln.lastModified,
      references: (vuln.references || []).slice(0, 5).map(r => r.url),
      timestamp: new Date().toISOString()
    });
  } catch (e) { res.status(500).json({ error: 'CVE lookup failed', details: e.message }); }
});

// ==================== SSL CERT CHECK ====================
app.get('/api/ssl/:hostname', async (req, res) => {
  const { hostname } = req.params;
  const port = parseInt(req.query.port) || 443;
  try {
    const cert = await new Promise((resolve, reject) => {
      const socket = tls.connect({ host: hostname, port, servername: hostname, rejectUnauthorized: false }, () => {
        resolve(socket.getPeerCertificate());
        socket.destroy();
      });
      socket.on('error', reject);
      setTimeout(() => { socket.destroy(); reject(new Error('timed out')); }, 6000);
    });
    if (!cert || !cert.subject) return res.status(400).json({ error: 'No certificate returned' });
    const expires = new Date(cert.valid_to);
    const daysRemaining = Math.floor((expires - Date.now()) / 86400000);
    res.json({
      hostname, valid: daysRemaining > 0, subject_cn: cert.subject?.CN,
      issuer: cert.issuer?.O, issued: cert.valid_from, expires: cert.valid_to,
      days_remaining: daysRemaining, san: cert.subjectaltname,
      timestamp: new Date().toISOString()
    });
  } catch (e) { res.status(500).json({ error: 'SSL check failed', details: e.message }); }
});

// ==================== HTTP STATUS CHECK ====================
app.get('/api/http-status', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url query parameter required' });
  try {
    const start = Date.now();
    const r = await axios.head(url, { timeout: 8000, maxRedirects: 5, validateStatus: () => true });
    res.json({
      url, status: r.status, status_text: r.statusText,
      server: r.headers['server'], content_type: r.headers['content-type'],
      latency_ms: Date.now() - start,
      final_url: r.request?.res?.responseUrl || url,
      timestamp: new Date().toISOString()
    });
  } catch (e) { res.status(500).json({ error: 'HTTP status check failed', details: e.message }); }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ollama Tools API running on http://localhost:${PORT}`);
  console.log(`📚 View endpoints: http://localhost:${PORT}/api/endpoints`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
