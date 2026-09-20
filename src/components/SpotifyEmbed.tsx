import { Music, ExternalLink, Sparkles } from "lucide-react";

interface SpotifyEmbedProps {
  playlistId?: string;
}

export default function SpotifyEmbed({ playlistId = "2sCu2R0XnUTw9na0ofT4vb" }: SpotifyEmbedProps) {
  const shareUrl = `https://open.spotify.com/playlist/${playlistId}`;

  return (
    <div id="spotify-embed-container" className="relative group overflow-hidden rounded bg-[#0a0a0a] border border-white/10 p-5 md:p-6 transition-all duration-300 hover:border-white/20">
      {/* Abstract Glowing Aura - subtle green */}
      <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[#1DB954]/5 blur-3xl pointer-events-none group-hover:bg-[#1DB954]/8 duration-300" />

      {/* Header Info */}
      <div id="spotify-embed-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 w-10 h-10 rounded bg-[#1DB954]/10 border border-[#1DB954]/20 text-[#1DB954] flex items-center justify-center">
            <Music className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-white/50 uppercase">OFFICIAL PLAYLIST</span>
              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1DB954]/10 border border-[#1DB954]/20 text-[#1DB954] uppercase tracking-wider font-bold">
                <Sparkles className="w-2.5 h-2.5" /> Synchronized
              </span>
            </div>
            <h3 className="font-display text-lg font-black text-white mt-1 uppercase italic tracking-tight">Bass Hypnosis: Psy & Progressive 2026</h3>
          </div>
        </div>

        <a
          id="spotify-open-btn"
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-[#1DB954] hover:bg-[#1ed760] text-black font-mono font-black text-xs tracking-wider transition-all duration-300 uppercase shrink-0"
        >
          <span>OPEN IN SPOTIFY</span>
          <ExternalLink className="w-3.5 h-3.5 text-black" />
        </a>
      </div>

      {/* Playlist Iframe Player */}
      <div id="spotify-player-iframe-wrapper" className="relative rounded overflow-hidden bg-black border border-white/5">
        <iframe
          title="Spotify Playlist"
          src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`}
          width="100%"
          height="380"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded border-0"
        />
      </div>

      {/* Curation Badge Details */}
      <div id="spotify-curation-text" className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono text-white/40">
        <div>
          <span className="text-[#1DB954] font-bold uppercase mr-1">Vibe:</span> Progressive House, Deep Progressive, Melodic Techno
        </div>
        <div>
          <span className="text-[#1DB954] font-bold uppercase mr-1">BPM Spectrum:</span> 118 – 135 BPM (Main: 121–124 BPM)
        </div>
        <div>
          <span className="text-[#1DB954] font-bold uppercase mr-1">Tempo:</span> Hypnotic Rolling Grooves & Deep Basslines
        </div>
      </div>
    </div>
  );
}
