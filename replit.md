# Discord Music Bot

## Visão Geral
Bot de música para Discord que reproduz músicas do YouTube e Spotify. Suporta links diretos e busca por nome/artista.

## Arquitetura

### Backend (server/)
- `server/index.ts` - Entry point do servidor Express
- `server/routes.ts` - Rotas da API (status do bot)
- `server/bot/discord-client.ts` - Cliente Discord com comandos de música
- `server/bot/spotify-client.ts` - Cliente Spotify para integração

### Frontend (client/)
- `client/src/App.tsx` - Componente principal com rotas
- `client/src/pages/dashboard.tsx` - Dashboard mostrando status do bot e comandos

### Shared (shared/)
- `shared/schema.ts` - Schemas TypeScript para Song, Queue, BotStatus

## Funcionalidades Implementadas

### Comandos do Bot
- `!play <link ou nome>` - Reproduz música (YouTube/Spotify)
- `!pause` - Pausa a música
- `!resume` - Retoma a música
- `!stop` - Para e limpa a fila
- `!skip` - Pula para próxima música
- `!queue` - Mostra a fila
- `!np` - Mostra música atual
- `!search <termo>` - Busca músicas
- `!volume <0-100>` - Ajusta volume
- `!loop [off|song|queue]` - Controla loop
- `!shuffle` - Embaralha fila
- `!remove <número>` - Remove da fila
- `!clear` - Limpa a fila
- `!help` - Lista comandos

### Fontes Suportadas
- YouTube (links e busca)
- Spotify (links de faixas)

## Variáveis de Ambiente
- `DISCORD_BOT_TOKEN` - Token do bot Discord (obrigatório)

## Como Adicionar o Bot ao Discord
1. Acesse https://discord.com/developers/applications
2. Crie uma aplicação e vá para "Bot"
3. Copie o token e adicione como DISCORD_BOT_TOKEN
4. Em "Privileged Gateway Intents", ative MESSAGE CONTENT INTENT
5. Use OAuth2 URL Generator para gerar link de convite
6. Permissões necessárias: Send Messages, Connect, Speak, Read Message History

## Tecnologias
- Discord.js + @discordjs/voice
- play-dl (streaming YouTube)
- @spotify/web-api-ts-sdk (Spotify API)
- React + TanStack Query (frontend)
- Express (backend)
