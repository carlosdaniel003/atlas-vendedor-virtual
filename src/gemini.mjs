import { VALID_STAGES } from './mock.mjs';

const SYSTEM = `Você é a assistente virtual de vendas da ATLAS, em uma DEMONSTRAÇÃO fictícia de venda de máquinas de cartão. Use português brasileiro natural, frases curtas, tom útil, não agressivo e máximo de 380 caracteres por resposta. Declare que é uma assistente virtual na primeira resposta, sem se passar por humano. Catalogo FICTÍCIO de demonstração: existem duas categorias de máquinas (compacta e com impressora), mas não há preços, taxas, frete, bandeiras, prazo ou condições reais cadastrados. NUNCA invente preços, taxas, descontos, garantias, taxas zero, entregas ou funcionalidades específicas. Quando necessário, informe que os dados comerciais oficiais não foram cadastrados e ofereça transferência ao responsável. Faça no máximo uma pergunta de qualificação por resposta. Quando o cliente disser expressamente que deseja comprar/finalizar, transfira para humano e não exija dados pessoais. Nunca solicite documentos, números de cartão ou códigos. Se o cliente pedir para não receber contatos, respeite. Não pressione. Não prometa acompanhamentos automáticos reais. Retorne SOMENTE objeto JSON com as chaves: reply (string), stage (um de novo, qualificando, negociando, pronto, acompanhamento, concluido), score (inteiro de 0 a 100, intensidade qualitativa de intenção, não é probabilidade), handoff (boolean), followup (boolean), reason (texto curto). O score é heurístico, não probabilidade estatística. Em caso de desejo explícito de finalizar, stage pronto e handoff true. Em opt-out, stage concluido e followup false.`;

export async function generateSalesReply({ apiKey, model, message, history = [], leadName = '' }) {
  const contents = history.slice(-16).filter(m => m && (m.role === 'cliente' || m.role === 'assistente')).map(m => ({
    role: m.role === 'cliente' ? 'user' : 'model',
    parts: [{ text: String(m.text ?? '').slice(0, 1400) }]
  }));
  contents.push({ role: 'user', parts: [{text: String(message).slice(0, 2000)}] });
  const json = await requestGemini(apiKey, model, {
    systemInstruction: { parts: [{ text: SYSTEM + `\nNome fictício do lead: ${String(leadName).slice(0, 80)}.` }] },
    contents,
    generationConfig: { temperature: 0.45, responseMimeType: 'application/json', maxOutputTokens: 850 }
  });
  const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('A IA retornou uma resposta fora do formato esperado. Tente novamente.'); }
  if (!parsed || typeof parsed.reply !== 'string' || !parsed.reply.trim()) throw new Error('A IA não retornou uma resposta válida.');
  const stage = VALID_STAGES.has(parsed.stage) ? parsed.stage : 'qualificando';
  const score = Number.isFinite(+parsed.score) ? Math.max(0, Math.min(100, Math.round(+parsed.score))) : 30;
  const stop = /não me (?:mande|envie|chame)|não quero (?:contato|mensagem)|remover contato|sair da lista/i.test(message);
  const ready = /quero (?:comprar|fechar|finalizar)|vou comprar|pode fechar|como finalizo/i.test(message);
  return {
    reply: parsed.reply.slice(0, 650),
    stage: stop ? 'concluido' : ready ? 'pronto' : stage,
    score: stop ? 0 : ready ? Math.max(90,score) : score,
    handoff: stop ? false : ready || Boolean(parsed.handoff),
    followup: stop || ready ? false : Boolean(parsed.followup),
    reason: String(parsed.reason ?? '').slice(0, 130)
  };
}

export async function transcribeAudio({ apiKey, model, mimeType, data }) {
  const allowed = new Set(['audio/ogg','audio/opus','audio/mpeg','audio/mp3','audio/mp4','audio/wav','audio/webm','audio/x-wav','audio/aac','audio/flac']);
  const mime = String(mimeType ?? '').toLowerCase().split(';')[0];
  if (!allowed.has(mime)) throw new Error('Formato de áudio não suportado. Use OGG, MP3, WAV, M4A ou WebM.');
  if (typeof data !== 'string' || data.length > 9_000_000 || !/^[A-Za-z0-9+/=]+$/.test(data)) throw new Error('Arquivo inválido ou grande demais (máximo aproximado de 6 MB).');
  const response = await requestGemini(apiKey, model, {
    contents: [{ role: 'user', parts: [{text:'Transcreva este áudio literalmente para português, sem comentários ou respostas. Se não conseguir entender, diga [áudio incompreensível].'}, { inlineData: { mimeType: mime, data } }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 850 }
  });
  const transcript = response?.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('').trim();
  if (!transcript) throw new Error('Não foi possível transcrever o áudio.');
  return transcript.slice(0, 3000);
}

async function requestGemini(apiKey, model, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = json?.error?.message ?? `HTTP ${response.status}`;
      throw new Error(`Erro do Gemini (${response.status}): ${String(detail).slice(0, 180)}`);
    }
    return json;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('A IA ultrapassou o tempo limite de resposta.');
    throw error;
  } finally { clearTimeout(timeout); }
}
