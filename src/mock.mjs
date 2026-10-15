export const VALID_STAGES = new Set(['novo', 'qualificando', 'negociando', 'pronto', 'acompanhamento', 'concluido']);

export function salesReply(message, history = []) {
  const original = String(message ?? '').trim();
  const text = original.toLocaleLowerCase('pt-BR');
  const has = (...terms) => terms.some(term => text.includes(term));
  const prior = history.filter(item => item.role === 'cliente').length;
  if (has('não quero', 'nao quero', 'parar', 'não me chame', 'nao me chame', 'remover contato', 'sair da lista')) {
    return { reply: 'Entendi. Não faremos novos contatos. Obrigado por avisar.', stage: 'concluido', score: 0, handoff: false, followup: false, reason: 'Contato não desejado' };
  }
  if (has('quero comprar', 'pode fechar', 'vou comprar', 'quero fechar', 'como finalizo', 'fechar pedido', 'enviar pagamento')) {
    return { reply: 'Ótimo! Vou encaminhar você para a pessoa responsável pela finalização. Ela confirmará as condições e explicará os próximos passos.', stage: 'pronto', score: 95, handoff: true, followup: false, reason: 'Pedido explícito para finalizar compra' };
  }
  if (has('taxa', 'preço', 'preco', 'valor', 'quanto custa', 'parcel', 'aluguel', 'juros')) {
    return { reply: 'Posso ajudar a comparar as opções. Para informar valores e taxas corretamente, preciso consultar a tabela comercial oficial, que ainda não foi cadastrada nesta demonstração. Você vende mais no débito, no crédito à vista ou parcelado?', stage: 'negociando', score: 65, handoff: false, followup: true, reason: 'Consultou condições comerciais' };
  }
  if (has('áudio', 'audio', 'ouvir', 'microfone')) {
    return { reply: 'Nesta demonstração, o envio de áudio é habilitado quando você configura a chave gratuita do Gemini. Posso continuar seu atendimento por texto enquanto isso.', stage: 'qualificando', score: 30, handoff: false, followup: false, reason: 'Perguntou sobre áudio' };
  }
  if (has('maquin', 'cartão', 'cartao', 'nfc', 'pix', 'comprovante', 'delivery')) {
    return { reply: 'Claro! Posso te orientar na escolha de uma maquininha. Qual é o tipo do seu negócio e, aproximadamente, quanto você vende por mês no cartão?', stage: 'qualificando', score: 45, handoff: false, followup: true, reason: 'Buscando informações sobre máquinas' };
  }
  if (has('mil', 'fatur', 'restaurante', 'lanchonete', 'salão', 'salao', 'loja', 'comércio', 'comercio')) {
    return { reply: 'Obrigado! Para encontrar uma opção adequada ao seu perfil, você recebe mais no crédito, débito ou parcelado? Depois podemos revisar as condições com um atendente.', stage: 'negociando', score: 70, handoff: false, followup: true, reason: 'Informou características do negócio' };
  }
  if (has('oi', 'olá', 'ola', 'bom dia', 'boa noite', 'boa tarde') || prior === 0) {
    return { reply: 'Olá! Sou a assistente virtual de vendas. Posso ajudar você a escolher uma maquininha. Você já usa alguma ou está procurando a primeira?', stage: 'qualificando', score: 25, handoff: false, followup: false, reason: 'Primeiro contato' };
  }
  return { reply: 'Entendi. Pode me contar um pouco mais sobre a sua necessidade? Assim consigo orientar melhor ou chamar uma pessoa quando for necessário.', stage: 'qualificando', score: 35, handoff: false, followup: true, reason: 'Precisa de mais qualificação' };
}
