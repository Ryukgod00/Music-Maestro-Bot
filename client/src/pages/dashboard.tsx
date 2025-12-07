import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, Wifi, WifiOff, Server, ListMusic, Clock, Terminal, Youtube, Disc } from "lucide-react";
import { SiDiscord, SiSpotify, SiYoutube } from "react-icons/si";
import type { BotStatus } from "@shared/schema";

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

export default function Dashboard() {
  const { data: status, isLoading, error } = useQuery<BotStatus>({
    queryKey: ['/api/bot/status'],
    refetchInterval: 5000,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-md">
              <Music className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Bot de Música Discord</h1>
              <p className="text-muted-foreground text-sm">Reproduza músicas do YouTube e Spotify</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {status?.isOnline ? (
              <Badge variant="default" className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
              <div className={`h-3 w-3 rounded-full ${status?.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{status?.isOnline ? 'Conectado' : 'Desconectado'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Servidores</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{isLoading ? '...' : status?.guildsCount ?? 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Filas Ativas</CardTitle>
              <ListMusic className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{isLoading ? '...' : status?.activeQueues ?? 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{isLoading ? '...' : formatUptime(status?.uptime ?? 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commands */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                <CardTitle>Comandos Disponíveis</CardTitle>
              </div>
              <CardDescription>Use estes comandos no Discord</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {status?.commands?.map((command, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-md">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm font-mono">
                          {command.usage}
                        </code>
                      </div>
                      <p className="text-sm text-muted-foreground">{command.description}</p>
                    </div>
                  )) ?? (
                    <p className="text-muted-foreground">Carregando comandos...</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Features & Info */}
          <div className="space-y-6">
            {/* Supported Sources */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Disc className="h-5 w-5 text-primary" />
                  <CardTitle>Fontes Suportadas</CardTitle>
                </div>
                <CardDescription>Reproduza músicas de diferentes plataformas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-red-500/10 rounded-md border border-red-500/20">
                    <SiYoutube className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="font-semibold">YouTube</p>
                      <p className="text-sm text-muted-foreground">Links e busca</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-md border border-green-500/20">
                    <SiSpotify className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="font-semibold">Spotify</p>
                      <p className="text-sm text-muted-foreground">Links de faixas</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How to Use */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <SiDiscord className="h-5 w-5 text-[#5865F2]" />
                  <CardTitle>Como Usar</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Entre em um canal de voz</p>
                      <p className="text-sm text-muted-foreground">O bot precisa que você esteja em um canal de voz para reproduzir músicas</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Use o comando !play</p>
                      <p className="text-sm text-muted-foreground">Digite <code className="bg-muted px-1 rounded">!play nome da música</code> ou cole um link do YouTube/Spotify</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Aproveite a música!</p>
                      <p className="text-sm text-muted-foreground">Use comandos como <code className="bg-muted px-1 rounded">!pause</code>, <code className="bg-muted px-1 rounded">!skip</code>, <code className="bg-muted px-1 rounded">!queue</code> para controlar a reprodução</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Examples */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exemplos de Uso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-2 bg-muted/50 rounded font-mono text-sm">
                    <span className="text-primary">!</span>play Bohemian Rhapsody Queen
                  </div>
                  <div className="p-2 bg-muted/50 rounded font-mono text-sm">
                    <span className="text-primary">!</span>play https://youtube.com/watch?v=...
                  </div>
                  <div className="p-2 bg-muted/50 rounded font-mono text-sm">
                    <span className="text-primary">!</span>play https://open.spotify.com/track/...
                  </div>
                  <div className="p-2 bg-muted/50 rounded font-mono text-sm">
                    <span className="text-primary">!</span>search Michael Jackson Thriller
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
