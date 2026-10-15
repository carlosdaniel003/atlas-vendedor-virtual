# ATLAS — Vendedor Virtual (protótipo gratuito)

Protótipo **local** para demonstrar o funcionamento de um vendedor virtual de máquinas de cartão, incluindo simulador de conversas, classificação de leads, transferência humana, acompanhamento **simulado** e importação CSV **local**.

> **Importante:** não existe integração com o WhatsApp nesta versão. A interface é um simulador. Nenhuma mensagem é enviada a números reais.

## Requisitos

- Node.js 20 ou superior (https://nodejs.org/)
- Um navegador moderno
- Opcionalmente, chave gratuita da API Gemini (https://aistudio.google.com/apikey)

Nenhum `npm install` é necessário: o protótipo usa apenas funcionalidades nativas do Node.js e arquivos HTML/CSS/JS.

## Executar sem gastar

1. Descompacte o ZIP e abra o terminal dentro da pasta `vendedor-ia-demo`.
2. Execute:

   ```bash
   npm start
   ```

3. Acesse **http://localhost:3000** no navegador.
4. Selecione Ana Lima e envie uma mensagem como se fosse cliente. Teste também Bruno (pronto para fechar), Marina (acompanhamento), a transferência manual, um novo lead e a importação CSV.

**Sem chave de IA**: respostas baseadas em regras programadas, claramente identificadas como simulação. Não são produzidas por um modelo generativo.

## Ativar IA real gratuitamente (opcional)

1. Abra https://aistudio.google.com/apikey e gere uma chave para a API Gemini, observando limites gratuitos disponíveis para sua conta.
2. Copie `.env.example` para `.env`.
3. Edite `.env` e coloque a chave em `GEMINI_API_KEY=...`.
4. Reinicie com `npm start`.
5. Confira o indicador **IA Gemini conectada** no topo do painel.

O modelo padrão é `gemini-3.1-flash-lite`. A API gratuita está sujeita a cotas e alterações. Se necessário, mude `GEMINI_MODEL` no `.env` para outro modelo com nível gratuito. Se houver erro de API, o chat exibirá o erro — **não** usará respostas simuladas escondendo a falha.

**Privacidade:** no modo IA real, mensagens e trechos de histórico são enviados ao Google para processamento. Não use nomes, números, áudios ou dados comerciais reais neste protótipo, especialmente na modalidade gratuita, cujos termos podem permitir uso dos dados para melhoria dos produtos. Nunca coloque a chave em arquivos `public/`.

## Enviar áudio

Com Gemini ativo, clique no ícone ao lado do campo de mensagem e selecione um áudio de até 6 MB (por exemplo, MP3, M4A, OGG, WAV ou WebM). O sistema transcreve o arquivo, preenche o campo de mensagem e **aguarda sua confirmação antes de enviar o texto para o motor de conversa**. Sem Gemini, a transcrição está desabilitada.

## Importação CSV de teste

Exemplo `contatos-exemplo.csv`:

```csv
nome;negocio
Rafael Souza;Loja de roupas
Patrícia Oliveira;Mercadinho
```

Use **Importar contatos** no menu. Os registros são salvos no `localStorage` daquele navegador. O protótipo não dispara abordagens automáticas nem verifica opt-in. **Não importe sua planilha real** aqui.

## Simulação de acompanhamento

Selecione um lead que ainda não esteja em `Pronto para fechar` ou `Encerrado`, clique em **Simular acompanhamento** e observe a mensagem aparecer no histórico. O botão não agenda nem envia mensagens externas.

## Organização dos arquivos

```
server.mjs       # Servidor HTTP e endpoints locais, chave protegida no backend
src/gemini.mjs   # Integração com modelo de IA e transcrição de áudio
src/mock.mjs     # Motor determinístico para a demonstração sem chave
public/         # Painel web (HTML, CSS e JavaScript independentes)
tests/          # Testes das regras da demonstração
.env.example    # Variáveis de configuração (sem segredos)
```

## Testar

```bash
npm test
```

## Limitações propositais desta etapa

- Sem WhatsApp real e sem necessidade de número telefônico.
- Sem envio automático, cron, cobrança ou campanhas.
- Sem autenticação/controle de acesso: não exponha o servidor na internet.
- Banco de dados local via `localStorage` (para demonstração apenas).
- Catálogo de produtos fictício, **sem taxas, preços ou promessa comercial verdadeira**.
- A pontuação de intenção é uma heurística ilustrativa, não probabilidade de compra.
- Não utilizar dados pessoais reais em modo gratuito de IA.

## Próxima etapa (somente após validação)

Depois de aprovar o protótipo visual e as conversas, podemos conectar o ambiente de **número de teste oficial da Meta**, preservar separação entre canal e inteligência artificial, criar um armazenamento persistente e implementar webhooks de mensagens. A Meta fornece números de teste e ambiente sandbox gratuito: https://whatsappbusiness.com/pt-br/developers/developer-hub/
