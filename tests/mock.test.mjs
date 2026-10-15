import test from 'node:test';
import assert from 'node:assert/strict';
import { salesReply, VALID_STAGES } from '../src/mock.mjs';

test('intenção explícita de compra encaminha ao vendedor',()=>{
  const r=salesReply('Gostei, quero comprar!');
  assert.equal(r.stage,'pronto'); assert.equal(r.handoff,true); assert.equal(r.followup,false);
});
test('opt-out impede acompanhamento',()=>{
  const r=salesReply('Não quero mais mensagens, pode me remover contato');
  assert.equal(r.stage,'concluido'); assert.equal(r.followup,false);
});
test('não inventa taxas e solicita tabela oficial',()=>{
  const r=salesReply('Qual é a taxa no crédito?');
  assert.match(r.reply,/não foi cadastrada/); assert.equal(r.stage,'negociando');
});
test('conversa inicial recebe identificação virtual',()=>{
  const r=salesReply('Oi'); assert.match(r.reply,/assistente virtual/);
});
test('todas as respostas têm estágio válido',()=>{
  for(const msg of ['oi','valor?','quero comprar','faturamento 5 mil','não quero mensagens','qual cor?']){
    assert.equal(VALID_STAGES.has(salesReply(msg).stage),true);
  }
});
