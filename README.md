# USelvi API

MVP de uma plataforma de API no estilo Whapi: cria instancias, gera token de API, expoe URL base, mostra QR da sessao e recebe chamadas autenticadas para envio de mensagens.

> Observacao importante: a API oficial do WhatsApp Business Cloud usa app da Meta, numero aprovado, token e webhooks. Login por QR normalmente pertence a integracoes baseadas no WhatsApp Web, que podem ter risco de bloqueio e nao sao o fluxo oficial da Meta. Este projeto deixa um adaptador isolado em `src/whatsapp-provider.js` para trocar o mock por um provedor real depois.

## Rodar

```powershell
copy .env.example .env
npm install
npm start
```

Servidor padrao:

```text
http://127.0.0.1:3000
```

Token administrativo padrao:

```text
change-me-admin-token
```

Troque esse valor no `.env` em producao.

## Banco de dados Neon

Para usar PostgreSQL/Neon, configure a variavel abaixo no `.env` local e tambem nas variaveis de ambiente da hospedagem:

```text
DATABASE_URL=postgresql://USUARIO:SENHA@HOST/neondb?sslmode=require
```

O projeto cria automaticamente as tabelas `instances` e `messages` na primeira chamada que usa o banco.
Se preferir preparar o banco manualmente antes do deploy, execute o arquivo `sql/neon-schema.sql` no SQL Editor do Neon.

Em producao, cadastre no Koyeb ou Render:

```text
PORT=3000
HOST=0.0.0.0
PUBLIC_API_URL=https://sua-api-publica
ADMIN_TOKEN=um-token-forte
DATABASE_URL=sua-url-do-neon
WHATSAPP_PROVIDER_URL=
WHATSAPP_PROVIDER_TOKEN=
QUEUE_MAX_ATTEMPTS=3
QUEUE_RETRY_BASE_MS=1500
QUEUE_RATE_LIMIT_MS=1000
WEBHOOK_TIMEOUT_MS=5000
```

Nunca coloque a `DATABASE_URL` dentro do codigo. Use somente `.env` local ou variaveis de ambiente da hospedagem.

Quando a hospedagem estiver conectada ao GitHub, coloque a URL publica real em `PUBLIC_API_URL`. A plataforma usa esse valor para gerar as webhooks de entrada automaticamente.

Para forcar arquivo local mesmo com `.env`, use:

```text
DATABASE_URL=file
```

## Provedor WhatsApp

O arquivo `src/whatsapp-provider.js` funciona em dois modos:

- Sem `WHATSAPP_PROVIDER_URL`: usa mock local para desenvolvimento.
- Com `WHATSAPP_PROVIDER_URL`: chama um provedor HTTP real.

Contrato esperado do provedor HTTP:

```text
POST /sessions/start
POST /messages/text
```

Ambas recebem JSON e podem usar `WHATSAPP_PROVIDER_TOKEN` como Bearer token.

## Painel web

Abra:

```text
http://127.0.0.1:3000/dashboard
```

O painel permite informar o token admin, criar instancias, visualizar QR, acompanhar metricas e mensagens recentes.
Cada instancia tambem mostra uma webhook de entrada pronta para copiar e cadastrar no provedor WhatsApp.

## Fluxo principal

### Health check

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
```

### Criar instancia

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:3000/v1/instances `
  -Headers @{ Authorization = "Bearer change-me-admin-token" } `
  -ContentType "application/json" `
  -Body '{"name":"Loja 01","webhookUrl":"https://example.com/webhook"}'
```

Resposta inclui:

- `data.id`: ID da instancia.
- `apiToken`: token que o cliente usa nos endpoints de mensagem.
- `apiUrl`: URL base da API.
- `data.qr`: payload do QR para conectar a sessao.

### Buscar QR

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:3000/v1/instances/INSTANCE_ID/qr `
  -Headers @{ Authorization = "Bearer change-me-admin-token" }
```

### Simular conexao

Enquanto o provedor real nao esta plugado, use:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:3000/v1/instances/INSTANCE_ID/connect `
  -Headers @{ Authorization = "Bearer change-me-admin-token" } `
  -ContentType "application/json" `
  -Body '{"phone":"5511999999999"}'
```

### Enviar mensagem

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:3000/v1/messages/text `
  -Headers @{ Authorization = "Bearer INSTANCE_API_TOKEN" } `
  -ContentType "application/json" `
  -Body '{"to":"5511999999999","text":"Ola! Mensagem enviada pela USelvi API."}'
```

## Endpoints

| Metodo | Rota | Auth | Descricao |
| --- | --- | --- | --- |
| `GET` | `/health` | Livre | Status do servico |
| `GET` | `/dashboard` | Livre | Painel web administrativo |
| `GET` | `/v1/instances` | Admin | Lista instancias |
| `POST` | `/v1/instances` | Admin | Cria instancia, token e QR |
| `GET` | `/v1/instances/:id` | Admin | Detalhe da instancia |
| `GET` | `/v1/instances/:id/qr` | Admin | Consulta QR atual |
| `POST` | `/v1/instances/:id/qr` | Admin | Regenera QR |
| `POST` | `/v1/instances/:id/token` | Admin | Gira token da instancia |
| `PUT` | `/v1/instances/:id/webhook` | Admin | Atualiza webhook |
| `POST` | `/v1/instances/:id/connect` | Admin | Simula conexao no MVP |
| `POST` | `/v1/instances/:id/inbound` | Admin | Simula mensagem recebida |
| `GET` | `/v1/metrics` | Admin | Metricas por status |
| `GET` | `/v1/messages` | Admin | Lista mensagens recentes |
| `POST` | `/v1/messages/text` | Instancia | Envia texto |
| `POST` | `/webhooks/whatsapp/:id/:secret` | URL secreta | Recebe eventos do provedor WhatsApp |

## Fila e webhooks

Ao chamar `POST /v1/messages/text`, a mensagem entra como `queued`. A fila processa o envio respeitando `QUEUE_RATE_LIMIT_MS`, tenta novamente ate `QUEUE_MAX_ATTEMPTS` e atualiza o status para `sent`, `retrying` ou `failed`.

Eventos enviados para `webhookUrl` da instancia:

- `instance.status`
- `message.sent`
- `message.retrying`
- `message.failed`
- `message.received`

## Webhook gerada pela plataforma

Ao criar uma instancia, a API gera uma URL no formato:

```text
https://sua-api-publica/webhooks/whatsapp/INSTANCE_ID/WEBHOOK_SECRET
```

Essa URL recebe eventos vindos do provedor WhatsApp. Exemplos aceitos:

```json
{
  "event": "message.received",
  "from": "5511999999999",
  "text": "Ola"
}
```

```json
{
  "event": "instance.status",
  "status": "connected",
  "phone": "5511999999999"
}
```
