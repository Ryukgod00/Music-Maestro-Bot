// Discord Integration - Using Replit connector
import { Client, GatewayIntentBits, Events, Message, VoiceChannel, EmbedBuilder, Colors, TextChannel } from 'discord.js';
import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  AudioPlayer,
  VoiceConnection
} from '@discordjs/voice';
import play from 'play-dl';
import { Queue, Song, BOT_COMMANDS } from '@shared/schema';
import { getUncachableSpotifyClient } from './spotify-client';

// Store queues per guild
const queues = new Map<string, Queue>();
const players = new Map<string, AudioPlayer>();
const connections = new Map<string, VoiceConnection>();

let discordClient: Client | null = null;
let botStartTime: number = Date.now();

// Discord connector authentication
let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=discord',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Discord not connected');
  }
  return accessToken;
}

// Get or create queue for a guild
function getQueue(guildId: string): Queue {
  if (!queues.has(guildId)) {
    queues.set(guildId, {
      guildId,
      songs: [],
      currentIndex: 0,
      isPlaying: false,
      isPaused: false,
      volume: 50,
      loop: 'off',
    });
  }
  return queues.get(guildId)!;
}

// Parse YouTube URL
function isYoutubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

// Parse Spotify URL
function isSpotifyUrl(url: string): boolean {
  return url.includes('spotify.com');
}

// Search YouTube for a song
async function searchYouTube(query: string): Promise<Song | null> {
  try {
    const results = await play.search(query, { limit: 1 });
    if (results.length === 0) return null;

    const video = results[0];
    return {
      id: video.id || '',
      title: video.title || 'Unknown',
      artist: video.channel?.name || 'Unknown',
      duration: video.durationInSec || 0,
      url: video.url,
      source: 'youtube',
      thumbnail: video.thumbnails?.[0]?.url,
    };
  } catch (error) {
    console.error('YouTube search error:', error);
    return null;
  }
}

// Get song info from YouTube URL
async function getYouTubeInfo(url: string): Promise<Song | null> {
  try {
    const info = await play.video_info(url);
    const details = info.video_details;
    return {
      id: details.id || '',
      title: details.title || 'Unknown',
      artist: details.channel?.name || 'Unknown',
      duration: details.durationInSec || 0,
      url: details.url,
      source: 'youtube',
      thumbnail: details.thumbnails?.[0]?.url,
    };
  } catch (error) {
    console.error('YouTube info error:', error);
    return null;
  }
}

// Search Spotify and get YouTube equivalent
async function searchSpotify(query: string): Promise<Song | null> {
  try {
    const spotify = await getUncachableSpotifyClient();
    const results = await spotify.search(query, ['track'], undefined, 1);
    
    if (!results.tracks?.items?.length) return null;

    const track = results.tracks.items[0];
    const searchQuery = `${track.name} ${track.artists.map(a => a.name).join(' ')}`;
    
    // Search YouTube for the song
    const youtubeSong = await searchYouTube(searchQuery);
    if (!youtubeSong) return null;

    return {
      ...youtubeSong,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      source: 'spotify',
      thumbnail: track.album.images?.[0]?.url || youtubeSong.thumbnail,
    };
  } catch (error) {
    console.error('Spotify search error:', error);
    return null;
  }
}

// Get song from Spotify URL
async function getSpotifyTrack(url: string): Promise<Song | null> {
  try {
    const spotify = await getUncachableSpotifyClient();
    const trackId = url.split('/track/')[1]?.split('?')[0];
    
    if (!trackId) return null;

    const track = await spotify.tracks.get(trackId);
    const searchQuery = `${track.name} ${track.artists.map(a => a.name).join(' ')}`;
    
    // Search YouTube for the song
    const youtubeSong = await searchYouTube(searchQuery);
    if (!youtubeSong) return null;

    return {
      ...youtubeSong,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      source: 'spotify',
      thumbnail: track.album.images?.[0]?.url || youtubeSong.thumbnail,
    };
  } catch (error) {
    console.error('Spotify track error:', error);
    return null;
  }
}

// Play the current song
async function playSong(guildId: string, textChannel: TextChannel): Promise<void> {
  const queue = getQueue(guildId);
  
  if (queue.songs.length === 0 || queue.currentIndex >= queue.songs.length) {
    queue.isPlaying = false;
    const connection = connections.get(guildId);
    if (connection) {
      connection.destroy();
      connections.delete(guildId);
    }
    return;
  }

  const song = queue.songs[queue.currentIndex];
  
  try {
    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });

    let player = players.get(guildId);
    if (!player) {
      player = createAudioPlayer();
      players.set(guildId, player);
      
      const connection = connections.get(guildId);
      if (connection) {
        connection.subscribe(player);
      }
    }

    player.play(resource);
    queue.isPlaying = true;
    queue.isPaused = false;

    // Send now playing embed
    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle('Tocando Agora')
      .setDescription(`**${song.title}**`)
      .addFields(
        { name: 'Artista', value: song.artist, inline: true },
        { name: 'Duração', value: formatDuration(song.duration), inline: true },
        { name: 'Fonte', value: song.source === 'youtube' ? 'YouTube' : 'Spotify', inline: true }
      );
    
    if (song.thumbnail) {
      embed.setThumbnail(song.thumbnail);
    }

    textChannel.send({ embeds: [embed] });

    player.on(AudioPlayerStatus.Idle, () => {
      // Handle loop modes
      if (queue.loop === 'song') {
        playSong(guildId, textChannel);
      } else {
        queue.currentIndex++;
        if (queue.loop === 'queue' && queue.currentIndex >= queue.songs.length) {
          queue.currentIndex = 0;
        }
        playSong(guildId, textChannel);
      }
    });

    player.on('error', (error) => {
      console.error('Player error:', error);
      queue.currentIndex++;
      playSong(guildId, textChannel);
    });

  } catch (error) {
    console.error('Play error:', error);
    textChannel.send('Erro ao reproduzir a música. Pulando para a próxima...');
    queue.currentIndex++;
    playSong(guildId, textChannel);
  }
}

// Format duration to mm:ss
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Command handlers
async function handlePlay(message: Message, args: string[]): Promise<void> {
  const voiceChannel = message.member?.voice.channel as VoiceChannel;
  
  if (!voiceChannel) {
    message.reply('Você precisa estar em um canal de voz!');
    return;
  }

  const query = args.join(' ');
  if (!query) {
    message.reply('Por favor, forneça um link ou nome da música!');
    return;
  }

  let song: Song | null = null;

  // Check if it's a URL or search query
  if (isYoutubeUrl(query)) {
    song = await getYouTubeInfo(query);
  } else if (isSpotifyUrl(query)) {
    song = await getSpotifyTrack(query);
  } else {
    // Search by name
    song = await searchYouTube(query);
  }

  if (!song) {
    message.reply('Não consegui encontrar essa música!');
    return;
  }

  song.requestedBy = message.author.username;

  const queue = getQueue(message.guildId!);
  queue.songs.push(song);

  // Connect to voice channel if not connected
  if (!connections.has(message.guildId!)) {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guildId!,
      adapterCreator: message.guild!.voiceAdapterCreator as any,
    });
    connections.set(message.guildId!, connection);

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      connections.delete(message.guildId!);
      players.delete(message.guildId!);
      queues.delete(message.guildId!);
    });
  }

  // If not playing, start playing
  if (!queue.isPlaying) {
    playSong(message.guildId!, message.channel as TextChannel);
  } else {
    const embed = new EmbedBuilder()
      .setColor(Colors.Blue)
      .setTitle('Adicionado à Fila')
      .setDescription(`**${song.title}** - ${song.artist}`)
      .addFields({ name: 'Posição', value: `#${queue.songs.length}`, inline: true });
    
    if (song.thumbnail) {
      embed.setThumbnail(song.thumbnail);
    }

    message.reply({ embeds: [embed] });
  }
}

async function handlePause(message: Message): Promise<void> {
  const player = players.get(message.guildId!);
  const queue = getQueue(message.guildId!);
  
  if (player && queue.isPlaying && !queue.isPaused) {
    player.pause();
    queue.isPaused = true;
    message.reply('Música pausada!');
  } else {
    message.reply('Não há música tocando!');
  }
}

async function handleResume(message: Message): Promise<void> {
  const player = players.get(message.guildId!);
  const queue = getQueue(message.guildId!);
  
  if (player && queue.isPaused) {
    player.unpause();
    queue.isPaused = false;
    message.reply('Música retomada!');
  } else {
    message.reply('A música não está pausada!');
  }
}

async function handleStop(message: Message): Promise<void> {
  const player = players.get(message.guildId!);
  const connection = connections.get(message.guildId!);
  
  if (player) {
    player.stop();
  }
  if (connection) {
    connection.destroy();
    connections.delete(message.guildId!);
  }
  
  queues.delete(message.guildId!);
  players.delete(message.guildId!);
  
  message.reply('Reprodução parada e fila limpa!');
}

async function handleSkip(message: Message): Promise<void> {
  const player = players.get(message.guildId!);
  const queue = getQueue(message.guildId!);
  
  if (player && queue.isPlaying) {
    queue.currentIndex++;
    player.stop();
    message.reply('Música pulada!');
  } else {
    message.reply('Não há música para pular!');
  }
}

async function handleQueue(message: Message): Promise<void> {
  const queue = getQueue(message.guildId!);
  
  if (queue.songs.length === 0) {
    message.reply('A fila está vazia!');
    return;
  }

  const songList = queue.songs
    .map((song, index) => {
      const prefix = index === queue.currentIndex ? '▶️' : `${index + 1}.`;
      return `${prefix} **${song.title}** - ${song.artist} (${formatDuration(song.duration)})`;
    })
    .slice(0, 10)
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor(Colors.Purple)
    .setTitle('Fila de Músicas')
    .setDescription(songList)
    .setFooter({ text: `Total: ${queue.songs.length} músicas` });

  message.reply({ embeds: [embed] });
}

async function handleNowPlaying(message: Message): Promise<void> {
  const queue = getQueue(message.guildId!);
  
  if (!queue.isPlaying || queue.songs.length === 0) {
    message.reply('Não há música tocando!');
    return;
  }

  const song = queue.songs[queue.currentIndex];
  
  const embed = new EmbedBuilder()
    .setColor(Colors.Green)
    .setTitle('Tocando Agora')
    .setDescription(`**${song.title}**`)
    .addFields(
      { name: 'Artista', value: song.artist, inline: true },
      { name: 'Duração', value: formatDuration(song.duration), inline: true },
      { name: 'Fonte', value: song.source === 'youtube' ? 'YouTube' : 'Spotify', inline: true }
    );

  if (song.thumbnail) {
    embed.setThumbnail(song.thumbnail);
  }

  message.reply({ embeds: [embed] });
}

async function handleSearch(message: Message, args: string[]): Promise<void> {
  const query = args.join(' ');
  
  if (!query) {
    message.reply('Por favor, forneça um termo de busca!');
    return;
  }

  try {
    const results = await play.search(query, { limit: 5 });
    
    if (results.length === 0) {
      message.reply('Nenhum resultado encontrado!');
      return;
    }

    const resultList = results
      .map((result, index) => `${index + 1}. **${result.title}** - ${result.channel?.name} (${formatDuration(result.durationInSec || 0)})`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(Colors.Orange)
      .setTitle('Resultados da Busca')
      .setDescription(resultList)
      .setFooter({ text: 'Use !play <link> para tocar uma música' });

    message.reply({ embeds: [embed] });
  } catch (error) {
    message.reply('Erro ao buscar músicas!');
  }
}

async function handleVolume(message: Message, args: string[]): Promise<void> {
  const queue = getQueue(message.guildId!);
  const volume = parseInt(args[0]);
  
  if (isNaN(volume) || volume < 0 || volume > 100) {
    message.reply('Por favor, forneça um volume entre 0 e 100!');
    return;
  }

  queue.volume = volume;
  message.reply(`Volume ajustado para ${volume}%`);
}

async function handleLoop(message: Message, args: string[]): Promise<void> {
  const queue = getQueue(message.guildId!);
  const mode = args[0]?.toLowerCase();
  
  if (!mode || !['off', 'song', 'queue'].includes(mode)) {
    message.reply(`Loop atual: **${queue.loop}**. Use: !loop [off|song|queue]`);
    return;
  }

  queue.loop = mode as 'off' | 'song' | 'queue';
  const modeText = mode === 'off' ? 'desativado' : mode === 'song' ? 'música atual' : 'fila inteira';
  message.reply(`Loop ${modeText}!`);
}

async function handleShuffle(message: Message): Promise<void> {
  const queue = getQueue(message.guildId!);
  
  if (queue.songs.length <= 1) {
    message.reply('Não há músicas suficientes para embaralhar!');
    return;
  }

  // Keep current song, shuffle the rest
  const currentSong = queue.songs[queue.currentIndex];
  const otherSongs = queue.songs.filter((_, i) => i !== queue.currentIndex);
  
  // Fisher-Yates shuffle
  for (let i = otherSongs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]];
  }

  queue.songs = [currentSong, ...otherSongs];
  queue.currentIndex = 0;
  
  message.reply('Fila embaralhada!');
}

async function handleRemove(message: Message, args: string[]): Promise<void> {
  const queue = getQueue(message.guildId!);
  const index = parseInt(args[0]) - 1;
  
  if (isNaN(index) || index < 0 || index >= queue.songs.length) {
    message.reply('Por favor, forneça um número válido!');
    return;
  }

  if (index === queue.currentIndex) {
    message.reply('Não é possível remover a música atual! Use !skip');
    return;
  }

  const removed = queue.songs.splice(index, 1)[0];
  
  // Adjust current index if needed
  if (index < queue.currentIndex) {
    queue.currentIndex--;
  }

  message.reply(`Removido: **${removed.title}**`);
}

async function handleClear(message: Message): Promise<void> {
  const queue = getQueue(message.guildId!);
  
  if (queue.songs.length <= 1) {
    message.reply('A fila já está vazia!');
    return;
  }

  // Keep only the current song
  const currentSong = queue.songs[queue.currentIndex];
  queue.songs = [currentSong];
  queue.currentIndex = 0;

  message.reply('Fila limpa! Apenas a música atual foi mantida.');
}

async function handleHelp(message: Message): Promise<void> {
  const commandList = BOT_COMMANDS
    .map(cmd => `**${cmd.usage}**\n${cmd.description}`)
    .join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(Colors.Gold)
    .setTitle('Comandos do Bot de Música')
    .setDescription(commandList)
    .setFooter({ text: 'Bot de Música do Discord' });

  message.reply({ embeds: [embed] });
}

// Message handler
async function handleMessage(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  switch (command) {
    case 'play':
    case 'p':
      await handlePlay(message, args);
      break;
    case 'pause':
      await handlePause(message);
      break;
    case 'resume':
    case 'unpause':
      await handleResume(message);
      break;
    case 'stop':
      await handleStop(message);
      break;
    case 'skip':
    case 's':
      await handleSkip(message);
      break;
    case 'queue':
    case 'q':
      await handleQueue(message);
      break;
    case 'nowplaying':
    case 'np':
      await handleNowPlaying(message);
      break;
    case 'search':
      await handleSearch(message, args);
      break;
    case 'volume':
    case 'vol':
      await handleVolume(message, args);
      break;
    case 'loop':
      await handleLoop(message, args);
      break;
    case 'shuffle':
      await handleShuffle(message);
      break;
    case 'remove':
      await handleRemove(message, args);
      break;
    case 'clear':
      await handleClear(message);
      break;
    case 'help':
    case 'h':
      await handleHelp(message);
      break;
  }
}

// Initialize bot
export async function initDiscordBot(): Promise<void> {
  try {
    const token = await getAccessToken();
    
    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
      ],
    });

    discordClient.on(Events.ClientReady, (client) => {
      console.log(`Bot conectado como ${client.user.tag}`);
      botStartTime = Date.now();
    });

    discordClient.on(Events.MessageCreate, handleMessage);

    await discordClient.login(token);
    console.log('Discord bot iniciado com sucesso!');
  } catch (error) {
    console.error('Erro ao iniciar bot Discord:', error);
  }
}

// Get bot status for API
export function getBotStatus() {
  return {
    isOnline: discordClient?.isReady() ?? false,
    guildsCount: discordClient?.guilds.cache.size ?? 0,
    activeQueues: Array.from(queues.values()).filter(q => q.isPlaying).length,
    uptime: Math.floor((Date.now() - botStartTime) / 1000),
    commands: BOT_COMMANDS,
  };
}
