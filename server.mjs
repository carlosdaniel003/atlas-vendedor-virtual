import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { salesReply } from './src/mock.mjs';
import { generateSalesReply, transcribeAudio } from './src/gemini.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');

// Loader mínimo para .env local; sem instalar dependências ou expor segredos no navegador.
try {
  const lines = (await fs.readFile(path.join(ROOT, '.env'), 'utf8')).split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
} catch { /* .env é opcional */ }
const KEY = process.env.GEMINI_API_KEY?.trim() ?? '';
const MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite';
const PORT = Number(process.env.PORT || 3000);

const typeByExtension = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.ico':'image/x-icon' };

function json(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(payload));
}

async function readJson(req, maxBytes = 140_000) {
  let chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('Solicitação maior que o limite permitido.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('JSON inválido.'); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = url.pathname;
  try {
    if (pathname.startsWith('/api/')) {
      if (pathname === '/api/config' && req.method === 'GET') {
        return json(res, 200, { aiEnabled: Boolean(KEY), model: KEY ? MODEL : null, whatsappConnected: false, mode: KEY ? 'gemini' : 'simulacao' });
      }
      if (pathname === '/api/reply' && req.method === 'POST') {
        const body = await readJson(req);
        if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 2000) return json(res, 400, { error:'Mensagem inválida (máximo de 2000 caracteres).' });
        const history = Array.isArray(body.history) ? body.history.slice(-16) : [];
        const data = KEY ? await generateSalesReply({ apiKey: KEY, model: MODEL, message: body.message, history, leadName: body.leadName }) : salesReply(body.message, history);
        return json(res, 200, { ...data, mode: KEY ? 'gemini' : 'simulacao' });
      }
      if (pathname === '/api/transcribe' && req.method === 'POST') {
        if (!KEY) return json(res, 400, { error:'Configure GEMINI_API_KEY para habilitar transcrição real de áudios.' });
        const body = await readJson(req, 9_200_000);
        const transcript = await transcribeAudio({ apiKey:KEY, model:MODEL, mimeType:body.mimeType, data:body.data });
        return json(res, 200, { transcript });
      }
      return json(res, 404, {error:'Endpoint inexistente.'});
    }
    if (req.method !== 'GET') return json(res, 405, {error:'Método não permitido.'});
    const filePath = path.resolve(PUBLIC, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
    if (filePath !== PUBLIC && !filePath.startsWith(PUBLIC + path.sep)) return json(res, 403, {error:'Acesso negado.'});
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat?.isFile()) return json(res, 404, {error:'Arquivo não encontrado.'});
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': typeByExtension[ext] || 'application/octet-stream', 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-cache' });
    res.end(await fs.readFile(filePath));
  } catch (error) {
    console.error(`[${new Date().toISOString()}]`, error.message);
    return json(res, 500, {error:error.message || 'Erro no servidor.'});
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(`ATLAS Demo | http://localhost:${PORT} | modo: ${KEY ? 'Gemini real' : 'simulação'}`));
