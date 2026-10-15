const STORAGE_KEY = 'atlas-sales-demo-0.1';
const $ = id => document.getElementById(id);
const STAGE_LABEL = { novo: 'Novo', qualificando: 'Qualificando', negociando: 'Em negociação', pronto: 'Pronto para fechar', acompanhamento: 'Acompanhamento', concluido: 'Encerrado' };
const STAGE_NEXT = { novo: 'Iniciar contato', qualificando: 'Entender necessidade', negociando: 'Resolver objeções', pronto: 'Atendimento humano', acompanhamento: 'Avaliar retomada', concluido: 'Nenhum contato' };
const AVATAR_BG = ['#e7eee8','#e6eafa','#fae9de','#f6e7ef','#e0efed','#ebe8fb'];

const date = () => new Date().toISOString();
function seed() {
  return [
    { id: 'l1', name: 'Ana Lima', business: 'Cafeteria', source: 'Tráfego pago', stage: 'qualificando', score: 42, reason: 'Cliente pesquisando soluções para o negócio.', manual: false, followup: false, updatedAt: date(), messages: [
      { role: 'cliente', text: 'Oi! Vi o anúncio de vocês. Queria saber sobre a maquininha.', time: date() },
      { role: 'assistente', text: 'Olá, Ana! Sou a assistente virtual de vendas. Você já utiliza alguma máquina no seu negócio ou está buscando a primeira?', time: date() },
      { role: 'cliente', text: 'Tenho uma cafeteria pequena e quero comparar as opções.', time: date() }
    ]},
    { id: 'l2', name: 'Bruno Rocha', business: 'Lanchonete', source: 'Tráfego pago', stage: 'pronto', score: 95, reason: 'Solicitou explicitamente a finalização da compra.', manual: true, followup: false, updatedAt: date(), messages: [
      { role: 'cliente', text: 'Tenho uma lanchonete e faturo cerca de 8 mil por mês.', time: date() },
      { role: 'assistente', text: 'Entendi! Posso te ajudar com as opções disponíveis. Para taxas e valores exatos, o responsável comercial confirmará as condições oficiais.', time: date() },
      { role: 'cliente', text: 'Quero comprar! Como faço para finalizar?', time: date() },
      { role: 'assistente', text: 'Perfeito. Vou encaminhar você para o responsável pela finalização, que confirmará as condições da compra.', time: date() },
      { role: 'evento', text: 'Transferência sugerida: comprador pronto para finalizar.', time: date() }
    ]},
    { id: 'l3', name: 'Marina Costa', business: 'Salão de beleza', source: 'Indicação', stage: 'acompanhamento', score: 55, reason: 'Demonstrou interesse, mas interrompeu a conversa.', manual: false, followup: true, updatedAt: date(), messages: [
      { role: 'cliente', text: 'Vocês têm máquina com comprovante impresso?', time: date() },
      { role: 'assistente', text: 'Há uma opção com impressora no catálogo demonstrativo. Quer que eu explique como avaliar qual categoria atende melhor o seu salão?', time: date() },
      { role: 'evento', text: 'Acompanhamento pendente. Nenhuma mensagem externa será enviada.', time: date() }
    ]}
  ];
}
function safeStoredLeads() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(data) && data.length && data.every(i => i.id && i.name && Array.isArray(i.messages))) return data;
  } catch {}
  return seed();
}
const state = { leads: safeStoredLeads(), activeId: 'l1', filter: 'all', search: '', busy: false, config: {aiEnabled: false, mode:'simulacao'}, toastTimer: null };
if (!state.leads.some(l => l.id === state.activeId)) state.activeId = state.leads[0]?.id;
const active = () => state.leads.find(l => l.id === state.activeId);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const initials = name => String(name).trim().split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()??'').join('');
const timeLabel = stamp => { try { return new Date(stamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}); } catch { return ''; } };
const dateLabel = () => new Date().toLocaleDateString('pt-BR',{ day:'numeric',month:'long',year:'numeric'});
const avatarStyle = name => `background:${AVATAR_BG[(name?.charCodeAt(0) ?? 0) % AVATAR_BG.length]}`;
const persist = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.leads)); } catch { toast('Armazenamento do navegador indisponível.'); } };

function toast(message) {
  clearTimeout(state.toastTimer);
  $('toast').textContent = message;
  $('toast').classList.add('show');
  state.toastTimer = setTimeout(() => $('toast').classList.remove('show'), 4100);
}
function renderStats() {
  $('stat-total').textContent = state.leads.length;
  $('stat-negotiating').textContent = state.leads.filter(l => ['qualificando','negociando'].includes(l.stage)).length;
  $('stat-ready').textContent = state.leads.filter(l => l.stage === 'pronto').length;
  $('stat-followup').textContent = state.leads.filter(l => l.stage === 'acompanhamento' || (l.followup && l.stage !== 'pronto' && l.stage !== 'concluido')).length;
  $('nav-leads-count').textContent = state.leads.length;
}
function filteredLeads() {
  const q = state.search.toLocaleLowerCase('pt-BR');
  return state.leads.filter(l => (state.filter === 'all' || (state.filter === 'ready' && l.stage === 'pronto') || (state.filter === 'followup' && (l.stage === 'acompanhamento'||l.followup))) && `${l.name} ${l.business}`.toLocaleLowerCase('pt-BR').includes(q));
}
function renderLeads() {
  const list = filteredLeads();
  $('inbox-subtitle').textContent = {all:'Todos os contatos',ready:'Perto da finalização',followup:'Contatos em acompanhamento'}[state.filter];
  $('leads-list').innerHTML = list.length ? list.map(l => {
    const last = l.messages.slice().reverse().find(m => m.role !== 'evento');
    return `<button type="button" class="lead-item ${l.id === state.activeId?'selected':''}" data-lead="${escapeHTML(l.id)}"><span class="avatar" style="${avatarStyle(l.name)}">${escapeHTML(initials(l.name))}</span><span class="lead-main"><span class="lead-name-row"><span class="lead-name">${escapeHTML(l.name)}</span><span class="lead-time">${timeLabel(l.updatedAt)}</span></span><span class="lead-preview">${escapeHTML(last?.text ?? l.business)}</span><span class="stage-pill ${escapeHTML(l.stage)}">${escapeHTML(STAGE_LABEL[l.stage] ?? 'Novo')}</span></span></button>`;
  }).join('') : '<div style="padding:20px 14px;font-size:11px;color:#94a59a">Nenhum lead encontrado.</div>';
  document.querySelectorAll('[data-lead]').forEach(el => el.addEventListener('click', () => { state.activeId = el.dataset.lead; renderAll(); }));
}
function renderConversation() {
  const l = active();
  if (!l) return;
  $('chat-avatar').textContent = initials(l.name);
  $('chat-avatar').style.background = AVATAR_BG[(l.name.charCodeAt(0))%AVATAR_BG.length];
  $('chat-name').textContent = l.name;
  $('chat-subtitle').textContent = `${l.business || 'Negócio não informado'} · WhatsApp simulado`;
  $('chat-status').textContent = l.manual ? 'Atendimento humano' : 'Assistente ativa';
  $('conversation').innerHTML = `<span class="chat-day">Demonstração — ${new Date().toLocaleDateString('pt-BR')}</span>` + l.messages.map(m => {
    if (m.role === 'evento') return `<div class="event">${escapeHTML(m.text)}</div>`;
    return `<div class="bubble ${m.role === 'cliente' ? 'client' : m.role === 'humano' ? 'human' : 'bot'}">${escapeHTML(m.text)}<small>${m.role === 'cliente' ? 'Cliente' : m.role === 'humano' ? 'Vendedor' : 'Assistente'} · ${timeLabel(m.time)}</small></div>`;
  }).join('');
  $('conversation').scrollTop = $('conversation').scrollHeight;
  $('composer-help').textContent = l.manual ? 'Modo manual: a mensagem abaixo será exibida como enviada pelo vendedor, somente nesta tela.' : 'Escreva como se fosse um cliente interessado.';
  $('message').placeholder = l.manual ? 'Responder como vendedor (simulação)...' : 'Digite uma mensagem como cliente...';
  $('composer-mode').textContent = l.manual ? 'Atendimento humano simulado' : state.config.aiEnabled ? 'IA real (Gemini)' : 'Respostas simuladas';
  $('typing').hidden = !state.busy;
  $('send').disabled = state.busy;
  $('audio-label').classList.toggle('disabled', !state.config.aiEnabled || state.busy || l.manual);
}
function renderInspector() {
  const l = active(); if (!l) return;
  $('profile-avatar').textContent = initials(l.name);
  $('profile-avatar').style.background = AVATAR_BG[l.name.charCodeAt(0)%AVATAR_BG.length];
  $('profile-name').textContent = l.name;
  $('profile-business').textContent = l.business || 'Negócio não informado';
  $('profile-stage').textContent = STAGE_LABEL[l.stage] ?? 'Novo';
  $('profile-stage').className = `stage-pill ${l.stage}`;
  $('intent-score').textContent = `${l.score}/100`;
  $('intent-text').textContent = l.score >= 85 ? 'Muito alto' : l.score >= 65 ? 'Alto' : l.score >= 40 ? 'Moderado' : 'Inicial';
  $('intent-bar').style.width = `${l.score}%`;
  $('detail-source').textContent = l.source;
  $('detail-activity').textContent = timeLabel(l.updatedAt);
  $('detail-next').textContent = STAGE_NEXT[l.stage] ?? 'Qualificar';
  $('detail-reason').textContent = l.reason || 'Aguardando interação.';
  $('toggle-manual').textContent = l.manual ? 'Devolver para assistente' : 'Assumir conversa';
  $('followup-btn').disabled = l.stage === 'pronto' || l.stage === 'concluido';
}
function renderAll() { renderStats(); renderLeads(); renderConversation(); renderInspector(); }
function append(l, role, text) { l.messages.push({role,text,time:date()}); l.updatedAt = date(); persist(); renderAll(); }

async function sendMessage() {
  if (state.busy) return;
  const text = $('message').value.trim();
  if (!text) return;
  const l = active(); if (!l) return;
  $('message').value = '';
  if (l.manual) { append(l,'humano',text); toast('Mensagem manual incluída apenas no simulador.'); return; }
  const history = l.messages.filter(m => m.role === 'cliente' || m.role === 'assistente').map(m => ({role:m.role, text:m.text}));
  append(l, 'cliente', text);
  state.busy = true; renderAll();
  try {
    const response = await fetch('/api/reply',{ method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history,leadName:l.name}) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha no processamento da mensagem.');
    l.score = data.score;
    l.stage = data.stage;
    l.reason = data.reason;
    l.followup = Boolean(data.followup);
    l.messages.push({role:'assistente',text:data.reply,time:date()});
    if (data.handoff) { l.manual = true; l.messages.push({role:'evento',text:'Atendimento encaminhado ao vendedor. Automação pausada para este lead.',time:date()}); toast(`Oportunidade de fechamento: ${l.name}`); }
    if (data.stage === 'concluido') l.followup = false;
    l.updatedAt = date(); persist();
  } catch (error) {
    l.messages.push({role:'evento',text:`Não foi possível gerar a resposta: ${error.message}`,time:date()});
    persist(); toast('Erro no atendimento: confira a conexão e a configuração da IA.');
  } finally { state.busy = false; renderAll(); }
}

function switchFilter(filter, selectedId) {
  state.filter = filter;
  if (selectedId) state.activeId = selectedId;
  else { const matches = filteredLeads(); if (matches.length && !matches.some(l => l.id === state.activeId)) state.activeId = matches[0].id; }
  ['dashboard','leads','ready','followup'].forEach(id => $('nav-'+id).classList.toggle('current', id === (filter==='ready'?'ready':filter==='followup'?'followup':'dashboard')));
  renderAll();
}
function createLead(name,business,source) {
  const lead = {id:crypto.randomUUID(),name,business,source,stage:'novo',score:0,reason:'Aguardando a primeira interação.',manual:false,followup:false,updatedAt:date(),messages:[{role:'evento',text:'Lead criado na demonstração. Nenhum contato externo realizado.',time:date()}]};
  state.leads.unshift(lead); state.activeId = lead.id; state.filter = 'all'; state.search=''; $('search').value=''; persist(); switchFilter('all',lead.id);
}
function parseLine(line, delimiter) {
  const out = []; let value=''; let quoted=false;
  for(let i=0; i<line.length;i++) {
    if(line[i]==='"'){ if(quoted && line[i+1]==='"'){value+='"';i++;} else quoted=!quoted; }
    else if (line[i] === delimiter && !quoted){out.push(value.trim());value='';}
    else value+=line[i];
  }
  out.push(value.trim()); return out;
}
async function importCSV(file) {
  if (!file) return;
  if (file.size > 1_000_000) {toast('A demonstração permite CSV de até 1 MB.'); return;}
  const content = (await file.text()).replace(/^\uFEFF/,'');
  const lines=content.split(/\r?\n/).filter(l=>l.trim());
  if(lines.length<2){toast('CSV vazio ou sem linhas de contatos.');return;}
  const delimiter = (lines[0].match(/;/g)||[]).length >= (lines[0].match(/,/g)||[]).length ? ';':',';
  const head=parseLine(lines[0],delimiter).map(h=>h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim());
  const nameIdx=head.findIndex(h=>['nome','name','cliente'].includes(h));
  const businessIdx=head.findIndex(h=>['negocio','empresa','business','segmento'].includes(h));
  if(nameIdx<0){toast('CSV precisa conter coluna nome (opcional: negocio, empresa).');return;}
  let count=0;
  for(const line of lines.slice(1,101)) {
    const values=parseLine(line,delimiter);
    const name=(values[nameIdx]||'').slice(0,60).trim();
    if (!name) continue;
    const business=businessIdx>=0?(values[businessIdx]||'').slice(0,80):'';
    state.leads.push({id:crypto.randomUUID(),name,business,source:'Lista de teste (CSV)',stage:'novo',score:0,reason:'Importado apenas para demonstração; sem contato automático.',manual:false,followup:false,updatedAt:date(),messages:[{role:'evento',text:'Lead importado localmente. Nenhuma mensagem externa realizada.',time:date()}]});
    count++;
  }
  persist(); switchFilter('all'); toast(`${count} contatos adicionados somente ao navegador. Não houve envio de mensagens.`);
}
function downloadJSON() {
  const blob=new Blob([JSON.stringify({exportedAt:date(),mode:'demonstracao',leads:state.leads},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const anchor=document.createElement('a');anchor.href=url;anchor.download='atlas-demo-leads.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function handleAudio(file) {
  if (!file) return;
  if (!state.config.aiEnabled) {toast('Para transcrever áudios, configure a chave gratuita do Gemini no arquivo .env.');return;}
  if (active()?.manual) {toast('Este lead está em atendimento manual.');return;}
  if (file.size>6_000_000) {toast('Use áudios com até 6 MB na demonstração.');return;}
  state.busy=true; renderAll();
  try {
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Não foi possível ler o arquivo.'));reader.readAsDataURL(file);});
    const response=await fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mimeType:file.type||({'.m4a':'audio/mp4','.mp3':'audio/mpeg','.ogg':'audio/ogg'}[file.name.slice(file.name.lastIndexOf('.')).toLowerCase()]||'audio/ogg'),data})});
    const json=await response.json();if(!response.ok)throw new Error(json.error||'Erro ao transcrever.');
    $('message').value=`[Mensagem de áudio transcrita]: ${json.transcript}`;
    toast('Áudio transcrito. Confira o texto e clique em Enviar.');
  } catch(error){toast(`Falha: ${error.message}`);}finally{state.busy=false;renderAll();}
}

function setupEvents() {
  $('send').addEventListener('click',sendMessage);
  $('message').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage();}});
  $('search').addEventListener('input',event=>{state.search=event.target.value;renderLeads();});
  $('nav-dashboard').addEventListener('click',()=>switchFilter('all'));
  $('nav-leads').addEventListener('click',()=>switchFilter('all'));
  $('nav-ready').addEventListener('click',()=>switchFilter('ready'));
  $('nav-followup').addEventListener('click',()=>switchFilter('followup'));
  $('toggle-manual').addEventListener('click',()=>{const l=active();l.manual=!l.manual;append(l,'evento',l.manual?'Atendimento manual iniciado: respostas automáticas pausadas.':'Atendimento devolvido à assistente virtual.');});
  $('followup-btn').addEventListener('click',()=>{
    const l=active();if(l.stage==='pronto'||l.stage==='concluido')return;
    l.stage='acompanhamento';l.followup=false;l.reason='Exemplo de mensagem de recuperação adicionada manualmente na demonstração.';
    append(l,'assistente','Olá! Passando para saber se você ainda gostaria de esclarecer alguma dúvida sobre as opções de maquininha. Se preferir, não voltamos a falar sobre isso.');
    append(l,'evento','Acompanhamento SIMULADO: nenhuma mensagem foi enviada ao WhatsApp.');toast('Acompanhamento simulado registrado no histórico.');
  });
  const modal=$('lead-dialog');const open=()=>modal.showModal();const close=()=>modal.close();
  $('new-lead').addEventListener('click',open);$('new-lead-short').addEventListener('click',open);$('close-modal').addEventListener('click',close);$('cancel-modal').addEventListener('click',close);
  $('lead-form').addEventListener('submit',event=>{event.preventDefault();const form=new FormData(event.target);createLead(String(form.get('name')||'').trim(),String(form.get('business')||'').trim(),String(form.get('source')||''));event.target.reset();close();});
  $('import-btn').addEventListener('click',()=>{if(confirm('Importe apenas dados fictícios ou de teste. Os contatos serão armazenados localmente e não receberão mensagens. Continuar?'))$('csv-input').click();});
  $('csv-input').addEventListener('change',async event=>{await importCSV(event.target.files[0]);event.target.value='';});
  $('export-btn').addEventListener('click',downloadJSON);
  $('reset-btn').addEventListener('click',()=>{if(confirm('Reiniciar a demonstração e apagar os contatos salvos neste navegador?')){localStorage.removeItem(STORAGE_KEY);state.leads=seed();state.activeId='l1';state.filter='all';state.search='';$('search').value='';renderAll();toast('Demonstração reiniciada.');}});
  $('audio-input').addEventListener('change',async event=>{await handleAudio(event.target.files[0]);event.target.value='';});
}
async function init() {
  $('current-date').textContent=dateLabel();setupEvents();renderAll();
  try {const response=await fetch('/api/config'); if (!response.ok) throw new Error();state.config=await response.json();}
  catch {toast('Servidor indisponível. Execute npm start e acesse http://localhost:3000.');}
  $('top-ai-status').textContent=state.config.aiEnabled?'IA Gemini conectada':'Modo de simulação';
  $('side-ai-label').textContent=state.config.aiEnabled?'Gemini ativo':'Respostas demonstrativas';
  $('live-privacy').textContent=state.config.aiEnabled?'Mensagens submetidas à IA serão enviadas à API do Google; não use dados reais.':'Nenhum texto é enviado a serviços de IA externos.';
  renderAll();
}
init();
