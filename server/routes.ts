import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initDiscordBot, getBotStatus } from "./bot/discord-client";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize Discord bot
  initDiscordBot().catch(console.error);

  // Bot status API
  app.get("/api/bot/status", (req, res) => {
    try {
      const status = getBotStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get bot status" });
    }
  });

  return httpServer;
}
