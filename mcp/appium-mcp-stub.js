#!/usr/bin/env node
/**
 * Minimal Appium-MCP stub. Exposes a few high-leverage Appium operations as MCP
 * tools so an LLM client (Claude Code, Cursor) can drive the device during test
 * authoring. Replace with a fully-featured server (e.g. an "appium-mcp" npm
 * package) when one stabilises.
 *
 * The actual MCP framing uses stdio JSON-RPC. This stub speaks the bare
 * protocol so a host can list tools and call find/click/sendKeys/screenshot.
 */

const APPIUM_URL = process.env.APPIUM_URL || 'http://127.0.0.1:4723';

const TOOLS = [
  { name: 'appium.startSession',   description: 'Start a new Appium session', inputSchema: { type: 'object', properties: { capabilities: { type: 'object' } }, required: ['capabilities'] } },
  { name: 'appium.endSession',     description: 'Delete an Appium session',   inputSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'] } },
  { name: 'appium.findElement',    description: 'Find an element',            inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, using: { type: 'string' }, value: { type: 'string' } }, required: ['sessionId','using','value'] } },
  { name: 'appium.click',          description: 'Tap an element',             inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, elementId: { type: 'string' } }, required: ['sessionId','elementId'] } },
  { name: 'appium.sendKeys',       description: 'Type text into an element',  inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, elementId: { type: 'string' }, text: { type: 'string' } }, required: ['sessionId','elementId','text'] } },
  { name: 'appium.pageSource',     description: 'Get current page source',    inputSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'] } },
  { name: 'appium.screenshot',     description: 'Take a screenshot (base64)', inputSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'] } },
];

async function call(path, method = 'GET', body) {
  const res = await fetch(`${APPIUM_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.value?.message || `HTTP ${res.status}`);
  return json.value;
}

const HANDLERS = {
  'appium.startSession': async ({ capabilities }) => call('/session', 'POST', { capabilities: { alwaysMatch: capabilities } }),
  'appium.endSession':   async ({ sessionId })   => call(`/session/${sessionId}`, 'DELETE'),
  'appium.findElement':  async ({ sessionId, using, value }) => call(`/session/${sessionId}/element`, 'POST', { using, value }),
  'appium.click':        async ({ sessionId, elementId }) => call(`/session/${sessionId}/execute/sync`, 'POST', { script: 'mobile: clickGesture', args: [{ elementId }] }),
  'appium.sendKeys':     async ({ sessionId, elementId, text }) => call(`/session/${sessionId}/element/${elementId}/value`, 'POST', { text }),
  'appium.pageSource':   async ({ sessionId }) => call(`/session/${sessionId}/source`),
  'appium.screenshot':   async ({ sessionId }) => call(`/session/${sessionId}/screenshot`),
};

function reply(id, result, error) {
  const msg = error ? { jsonrpc: '2.0', id, error } : { jsonrpc: '2.0', id, result };
  process.stdout.write(JSON.stringify(msg) + '\n');
}

let buf = '';
process.stdin.on('data', async (chunk) => {
  buf += chunk.toString();
  let i;
  while ((i = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let req;
    try { req = JSON.parse(line); } catch { continue; }
    try {
      if (req.method === 'initialize')    return reply(req.id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'appium-mcp-stub', version: '0.1.0' } });
      if (req.method === 'tools/list')    return reply(req.id, { tools: TOOLS });
      if (req.method === 'tools/call') {
        const handler = HANDLERS[req.params?.name];
        if (!handler) return reply(req.id, null, { code: -32601, message: 'Unknown tool: ' + req.params?.name });
        const result = await handler(req.params.arguments || {});
        return reply(req.id, { content: [{ type: 'text', text: JSON.stringify(result) }] });
      }
      reply(req.id, null, { code: -32601, message: 'Method not found: ' + req.method });
    } catch (e) {
      reply(req.id, null, { code: -32000, message: String(e?.message || e) });
    }
  }
});
