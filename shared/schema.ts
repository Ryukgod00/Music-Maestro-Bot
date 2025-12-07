import { z } from "zod";

// Song schema for queue items
export const songSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  duration: z.number(), // in seconds
  url: z.string(),
  source: z.enum(["youtube", "spotify"]),
  thumbnail: z.string().optional(),
  requestedBy: z.string().optional(),
});

export type Song = z.infer<typeof songSchema>;

// Queue schema for a guild
export const queueSchema = z.object({
  guildId: z.string(),
  songs: z.array(songSchema),
  currentIndex: z.number().default(0),
  isPlaying: z.boolean().default(false),
  isPaused: z.boolean().default(false),
  volume: z.number().min(0).max(100).default(50),
  loop: z.enum(["off", "song", "queue"]).default("off"),
});

export type Queue = z.infer<typeof queueSchema>;

// Bot status schema
export const botStatusSchema = z.object({
  isOnline: z.boolean(),
  guildsCount: z.number(),
  activeQueues: z.number(),
  uptime: z.number(), // in seconds
  commands: z.array(z.object({
    name: z.string(),
    description: z.string(),
    usage: z.string(),
  })),
});

export type BotStatus = z.infer<typeof botStatusSchema>;

// Search result schema
export const searchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  duration: z.number(),
  url: z.string(),
  source: z.enum(["youtube", "spotify"]),
  thumbnail: z.string().optional(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;

// User schema (keep for compatibility)
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };

// Bot commands list
export const BOT_COMMANDS = [
  {
    name: "play",
    description: "Reproduz uma música do YouTube ou Spotify",
    usage: "!play <link ou nome da música>",
  },
  {
    name: "pause",
    description: "Pausa a música atual",
    usage: "!pause",
  },
  {
    name: "resume",
    description: "Retoma a música pausada",
    usage: "!resume",
  },
  {
    name: "stop",
    description: "Para a reprodução e limpa a fila",
    usage: "!stop",
  },
  {
    name: "skip",
    description: "Pula para a próxima música",
    usage: "!skip",
  },
  {
    name: "queue",
    description: "Mostra a fila de músicas",
    usage: "!queue",
  },
  {
    name: "nowplaying",
    description: "Mostra a música atual",
    usage: "!np",
  },
  {
    name: "search",
    description: "Busca músicas por nome e artista",
    usage: "!search <nome> - <artista>",
  },
  {
    name: "volume",
    description: "Ajusta o volume (0-100)",
    usage: "!volume <número>",
  },
  {
    name: "loop",
    description: "Ativa/desativa loop",
    usage: "!loop [off|song|queue]",
  },
  {
    name: "shuffle",
    description: "Embaralha a fila",
    usage: "!shuffle",
  },
  {
    name: "remove",
    description: "Remove uma música da fila",
    usage: "!remove <número>",
  },
  {
    name: "clear",
    description: "Limpa a fila de músicas",
    usage: "!clear",
  },
  {
    name: "help",
    description: "Mostra todos os comandos",
    usage: "!help",
  },
];
