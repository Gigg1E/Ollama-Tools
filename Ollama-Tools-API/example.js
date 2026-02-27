// Example: Using the Tools API with Ollama
const axios = require('axios');

const OLLAMA_BASE = 'http://localhost:11434';
const TOOLS_API = 'http://localhost:3100';

// Available tools
const tools = {
  async search(query, numResults = 5) {
    const response = await axios.post(`${TOOLS_API}/api/search`, {
      query,
      num_results: numResults
    });
    return response.data;
  },

  async weather(location) {
    const response = await axios.get(`${TOOLS_API}/api/weather/${location}`);
    return response.data;
  },

  async timezone(location) {
    const response = await axios.get(`${TOOLS_API}/api/timezone/${location}`);
    return response.data;
  },

  async geocode(location) {
    const response = await axios.get(`${TOOLS_API}/api/geocode/${location}`);
    return response.data;
  },

  async ipLookup(ip = '') {
    const endpoint = ip ? `${TOOLS_API}/api/ip/${ip}` : `${TOOLS_API}/api/ip`;
    const response = await axios.get(endpoint);
    return response.data;
  },

  async dns(hostname) {
    const response = await axios.get(`${TOOLS_API}/api/dns/${hostname}`);
    return response.data;
  },

  async ping(host) {
    const response = await axios.get(`${TOOLS_API}/api/ping/${host}`);
    return response.data;
  },

  async currentTime() {
    const response = await axios.get(`${TOOLS_API}/api/time`);
    return response.data;
  }
};

// Call Ollama with a prompt
async function callOllama(prompt, model = 'qwen3:14b') {
  const response = await axios.post(`${OLLAMA_BASE}/api/generate`, {
    model,
    prompt,
    stream: false
  });
  return response.data.response;
}

// Simple tool detection and execution
async function chatWithTools(userMessage, model = 'qwen3:14b') {
  console.log(`\n🧑 User: ${userMessage}\n`);

  // First pass - let AI decide what tools it needs
  const systemPrompt = `You are a helpful assistant with access to these tools:
- search(query): Search the web
- weather(location): Get weather information
- timezone(location): Get timezone info
- geocode(location): Get coordinates of a place
- ipLookup(ip): Get IP information
- dns(hostname): DNS lookup
- ping(host): Ping a host
- currentTime(): Get current time

When you need to use a tool, respond with: TOOL: toolname(parameters)
Examples:
- TOOL: search("best pizza recipe")
- TOOL: weather("Jacksonville, FL")
- TOOL: geocode("Eiffel Tower")

If you don't need tools, just answer normally.

User: ${userMessage}
Assistant:`;

  let aiResponse = await callOllama(systemPrompt, model);
  console.log(`🤖 AI: ${aiResponse}\n`);

  // Check if AI wants to use tools
  if (aiResponse.includes('TOOL:')) {
    // Parse tool call (simple regex)
    const toolMatch = aiResponse.match(/TOOL:\s*(\w+)\((.*?)\)/);
    
    if (toolMatch) {
      const [, toolName, params] = toolMatch;
      const cleanParams = params.replace(/['"]/g, '').trim();
      
      console.log(`🔧 Using tool: ${toolName}(${cleanParams})\n`);
      
      // Execute the tool
      let toolResult;
      try {
        if (tools[toolName]) {
          toolResult = await tools[toolName](cleanParams);
          console.log(`📊 Tool result:`, JSON.stringify(toolResult, null, 2), '\n');
          
          // Second pass - give results back to AI
          const followupPrompt = `User asked: ${userMessage}

You used ${toolName} and got this result:
${JSON.stringify(toolResult, null, 2)}

Based on this information, provide a helpful answer to the user.`;

          const finalResponse = await callOllama(followupPrompt, model);
          console.log(`🤖 AI (final): ${finalResponse}\n`);
          return finalResponse;
        }
      } catch (error) {
        console.error(`❌ Tool error: ${error.message}`);
      }
    }
  }

  return aiResponse;
}

// Example usage
async function main() {
  try {
    // Test 1: Weather query
    await chatWithTools("What's the weather like in Miami?");
    
    // Test 2: Search query
    await chatWithTools("Search for the latest news about AI");
    
    // Test 3: Geolocation query
    await chatWithTools("Where is the Statue of Liberty located? Give me coordinates.");
    
    // Test 4: IP lookup
    await chatWithTools("Look up information about IP 8.8.8.8");
    
    // Test 5: Simple question (no tools needed)
    await chatWithTools("Tell me a joke");
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { tools, callOllama, chatWithTools };
