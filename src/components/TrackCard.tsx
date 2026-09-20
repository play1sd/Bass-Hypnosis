import React, { useState, useEffect, useRef } from "react";
import { Copy, Check, ThumbsUp, ChevronDown, ChevronUp, Share2, Plus, Sparkles, Sliders, ExternalLink, AlertCircle, Play, Pause, Music } from "lucide-react";
import { Song } from "../types";

interface TrackCardProps {
  key?: string;
  track: Song;
  onUpvote: (id: string, updatedVotes: number) => void;
}

export default function TrackCard({ track, onUpvote }: TrackCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Subscriber Session State Sync
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(() => {
    const saved = localStorage.getItem("newsletter_subscriber");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [needsToConnect, setNeedsToConnect] = useState(false);
  const [voteEmail, setVoteEmail] = useState("");
  const [votePassword, setVotePassword] = useState("");
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    const onStop = (e: any) => {
      if (e.detail?.exceptId !== track.id) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      }
    };
    window.addEventListener("stop-all-track-previews", onStop);
    return () => {
      window.removeEventListener("stop-all-track-previews", onStop);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [track.id]);

  const toggleAudioPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!track.previewUrl) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      window.dispatchEvent(new CustomEvent("stop-all-track-previews", { detail: { exceptId: track.id } }));
      if (!audioRef.current) {
        audioRef.current = new Audio(track.previewUrl);
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = () => setIsPlaying(false);
      }
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  useEffect(() => {
    const handleAuth = () => {
      const saved = localStorage.getItem("newsletter_subscriber");
      if (saved) {
        try {
          setCurrentUser(JSON.parse(saved));
        } catch (e) {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    };
    window.addEventListener("newsletter-auth-changed", handleAuth);
    return () => window.removeEventListener("newsletter-auth-changed", handleAuth);
  }, []);

  // Quick link sharing with canonical slug
  const canonicalTrackUrl = `${window.location.origin}/track/${track.slug || track.id}`;

  const handleShare = (network: "twitter" | "whatsapp" | "clipboard") => {
    const text = `Check out "${track.title}" by ${track.artist} (${track.bpm} BPM, ${track.key}, ${track.subgenre}) on the Bass Hypnosis 2026 curation hub!`;
    const shareUrl = canonicalTrackUrl;

    if (network === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
    } else if (network === "whatsapp") {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + shareUrl)}`, "_blank");
    } else {
      navigator.clipboard.writeText(`${track.title} - ${track.artist} (Track Profile: ${shareUrl})`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const copyKeywordToClipboard = (kw: string) => {
    navigator.clipboard.writeText(kw);
    setCopiedKeyword(kw);
    setTimeout(() => setCopiedKeyword(null), 1500);
  };

  const handleUpvoteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUpvoting) return;

    if (!currentUser) {
      setNeedsToConnect(true);
      setIsExpanded(true); // Auto expand to show verification form inside deep dive
      setVoteError("A newsletter-connected account is required to vote on tracks.");
      return;
    }

    setIsUpvoting(true);
    setVoteError(null);
    try {
      const res = await fetch(`/api/tracks/${track.id}/upvote`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser.email,
          password: currentUser.name // Take full name as password
        })
      });
      if (res.ok) {
        const data = await res.json();
        onUpvote(track.id, data.upvotes);
        setNeedsToConnect(false);
      } else {
        const errData = await res.json();
        setVoteError(errData.error || "Verification failed. Please reconnect.");
        setNeedsToConnect(true);
        setIsExpanded(true);
      }
    } catch (e) {
      console.error("Failed to upvote", e);
      setVoteError("Network error validating your voter membership.");
      setNeedsToConnect(true);
      setIsExpanded(true);
    } finally {
      setIsUpvoting(false);
    }
  };

  const handleAuthorizeAndVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpvoting) return;
    if (!voteEmail || !votePassword) {
      setVoteError("Please enter your registered email and full name as your password.");
      return;
    }

    setIsUpvoting(true);
    setVoteError(null);
    try {
      const res = await fetch(`/api/tracks/${track.id}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: voteEmail,
          password: votePassword
        })
      });

      if (res.ok) {
        const data = await res.json();
        onUpvote(track.id, data.upvotes);
        
        // Log in the user in localStorage so they don't have to verify again on other votes
        const verifiedUser = {
          id: "sub-" + Date.now(),
          email: voteEmail,
          name: votePassword,
          enrolledAt: new Date().toISOString()
        };
        localStorage.setItem("newsletter_subscriber", JSON.stringify(verifiedUser));
        window.dispatchEvent(new Event("newsletter-auth-changed"));
        
        setNeedsToConnect(false);
        setVoteEmail("");
        setVotePassword("");
      } else {
        const errData = await res.json();
        setVoteError(errData.error || "Credentials invalid. Check your subscription details.");
      }
    } catch (e) {
      console.error("Failed to authorize & upvote", e);
      setVoteError("Network response failure. Check server connectivity.");
    } finally {
      setIsUpvoting(false);
    }
  };

  return (
    <div
      id={`track-card-${track.id}`}
      className={`rounded border transition-all duration-300 overflow-hidden ${
        isExpanded
          ? "bg-[#0c0c0c] border-[#1DB954] shadow-[0_4px_30px_rgba(29,185,84,0.1)]"
          : "bg-[#0a0a0a] border-white/10 hover:bg-[#0c0c0c] hover:border-white/20"
      }`}
    >
      {/* Primary Card View */}
      <div
        className="p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[9px] font-mono tracking-wider text-[#1DB954] font-bold bg-[#1DB954]/10 px-2 py-0.5 rounded border border-[#1DB954]/20 uppercase">
              {track.subgenre}
            </span>
            {track.isCustomSubmission && (
              <span className="text-[9px] font-mono tracking-wider text-pink-400 font-bold bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20 uppercase flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Community Pick
              </span>
            )}
            <div className="flex items-center gap-1 text-[9px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10">
              <Sliders className="w-3 h-3 text-[#1DB954]" />
              <span className="uppercase font-bold">Energy: {track.energyScore}/10</span>
            </div>
          </div>
 
          <h3 className="font-display text-base md:text-lg font-black text-white uppercase tracking-tight italic mt-1">
            {track.title}
          </h3>
          <p className="text-sm text-white/60 font-mono tracking-wider">
            {track.artist}
          </p>
        </div>
 
        {/* Essential electronic parameters */}
        <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto md:shrink-0 justify-between md:justify-end border-t border-white/5 md:border-0 pt-3 md:pt-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-center">
              <span className="block text-[9px] font-mono text-white/40 uppercase tracking-widest font-black">Tempo</span>
              <span className="font-mono text-xs md:text-sm font-bold text-white">{track.bpm} <span className="text-[10px] text-white/45">BPM</span></span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="text-center">
              <span className="block text-[9px] font-mono text-white/40 uppercase tracking-widest font-black">Harmonic Key</span>
              <span className="font-mono text-xs md:text-sm font-bold text-[#1DB954]">{track.key}</span>
            </div>
            {track.durationMs && (
              <>
                <div className="h-6 w-px bg-white/10 hidden sm:block" />
                <div className="text-center hidden sm:block">
                  <span className="block text-[9px] font-mono text-white/40 uppercase tracking-widest font-black">Length</span>
                  <span className="font-mono text-xs md:text-sm font-bold text-white/70">
                    {Math.floor(track.durationMs / 60000)}:{Math.floor((track.durationMs % 60000) / 1000).toString().padStart(2, "0")}
                  </span>
                </div>
              </>
            )}
          </div>
 
          {/* Audio Preview, Upvoting and Expand Button */}
          <div className="flex items-center gap-2">
            {track.previewUrl && (
              <button
                type="button"
                onClick={toggleAudioPreview}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-all duration-300 ${
                  isPlaying
                    ? "bg-[#1DB954] text-black shadow-[0_0_15px_rgba(29,185,84,0.5)]"
                    : "bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-[#1DB954]/50"
                }`}
                title={isPlaying ? "Pause 30s audio sample" : "Play 30s audio sample"}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-black text-black" />
                    <span className="text-[11px] font-black tracking-wider">PLAYING</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span className="text-[11px] font-bold tracking-wider hidden sm:inline">PREVIEW</span>
                  </>
                )}
              </button>
            )}

            <button
              id={`upvote-btn-${track.id}`}
              onClick={handleUpvoteClick}
              disabled={isUpvoting}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold font-mono transition-all duration-300 ${
                isUpvoting ? "opacity-50" : "active:scale-95"
              } ${
                track.upvotes > 15
                  ? "bg-[#1DB954]/10 border-[#1DB954]/30 text-[#1DB954] hover:bg-[#1DB954]/20"
                  : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20"
              }`}
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${isUpvoting ? "animate-bounce text-[#1DB954]" : ""}`} />
              <span>{track.upvotes}</span>
            </button>
 
            <button
              className="p-2 rounded bg-white/5 border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-colors hidden sm:inline-flex"
              aria-label="Toggle Details"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
 
      {/* Expanded Deep-Dive Panel (SEO features & commentary) */}
      {isExpanded && (
        <div id={`track-expanded-${track.id}`} className="px-4 pb-5 md:px-5 md:pb-6 pt-3 border-t border-white/10 bg-[#050505] text-sm leading-relaxed text-white/85 space-y-4">
          
          {/* Subscriber Authentication gating for Voting */}
          {needsToConnect && (
            <div className="p-4 rounded border border-yellow-500/30 bg-yellow-950/10 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="text-xs font-mono font-black tracking-widest text-yellow-500 uppercase">
                    SUBSCRIBER AUTHENTICATION REQUIRED
                  </h5>
                  <p className="text-xs text-white/70">
                    Upvoting is exclusively enabled for our active newsletter community. 
                    Please enter your subscribed email address and your full name (acting as your secure vote password).
                  </p>
                </div>
              </div>

              <form onSubmit={handleAuthorizeAndVote} className="space-y-3 pt-1" onClick={(e) => e.stopPropagation()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono uppercase tracking-widest text-white/50">Subscribed Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. yourname@mail.com"
                      value={voteEmail}
                      onChange={(e) => setVoteEmail(e.target.value)}
                      className="w-full text-xs font-mono rounded bg-[#0a0a0a] border border-white/10 px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-[#1DB954] transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono uppercase tracking-widest text-white/50">Full Name (Voter Password)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AstralVibe"
                      value={votePassword}
                      onChange={(e) => setVotePassword(e.target.value)}
                      className="w-full text-xs font-sans rounded bg-[#0a0a0a] border border-white/10 px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-[#1DB954] transition-all"
                    />
                  </div>
                </div>

                {voteError && (
                  <p className="text-[10px] font-mono text-red-400 italic bg-red-950/20 px-2 py-1 rounded border border-red-500/10">
                    ⚠ {voteError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setNeedsToConnect(false)}
                    className="px-3.5 py-1.5 rounded border border-white/10 hover:bg-white/5 text-[10px] text-white/60 font-mono uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpvoting}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-mono text-[10px] font-black tracking-widest uppercase transition-colors cursor-pointer"
                  >
                    {isUpvoting ? "Authorizing..." : "Verify & Upvote"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Editor Review Quote */}
          {track.reviewQuote && (
            <div className="p-4 rounded bg-[#121212] border border-white/10 text-white/80 italic text-xs leading-relaxed flex gap-2 w-full">
              <span className="text-[#1DB954] text-xl font-serif shrink-0 font-bold">“</span>
              <p className="flex-1">{track.reviewQuote}</p>
            </div>
          )}
 
          {/* Detailed SEO Profile Block */}
          <div className="space-y-2">
            <span className="text-[9px] font-mono font-black tracking-widest text-[#1DB954] uppercase block">SEO Soundscape Profile</span>
            <p className="font-sans text-xs md:text-sm text-white/70 leading-relaxed bg-[#0a0a0a] p-4 rounded border border-white/5">
              {track.seoDescription}
            </p>
          </div>

          {/* Music Insights & Direct Links */}
          {(track.artistBio || track.aboutTrack || track.trackLinks) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded bg-[#101010]/60 border border-[#1DB954]/20">
              {track.artistBio && (
                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-black tracking-widest text-pink-400 uppercase block">Artist Biography</span>
                  <p className="text-xs text-white/80 leading-relaxed font-sans">{track.artistBio}</p>
                </div>
              )}
              {track.aboutTrack && (
                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-black tracking-widest text-[#1DB954] uppercase block">About This Track</span>
                  <p className="text-xs text-white/80 leading-relaxed font-sans">{track.aboutTrack}</p>
                </div>
              )}
              {track.trackLinks && (
                <div className="md:col-span-2 space-y-1.5 pt-2 border-t border-white/5">
                  <span className="text-[9px] font-mono font-black tracking-widest text-yellow-400 uppercase block">Curated Platforms & Direct Links</span>
                  <div className="text-xs text-white/50 space-y-1 font-mono leading-relaxed max-w-full overflow-hidden text-ellipsis">
                    {track.trackLinks.split("\n").map((line, idx) => {
                      const urlMatch = line.match(/(https?:\/\/[^\s]+)/g);
                      if (urlMatch) {
                        const url = urlMatch[0];
                        const textBeforeUrl = line.split(url)[0];
                        return (
                          <div key={idx} className="flex flex-wrap items-center gap-1">
                            <span className="text-white/60 text-[11px]">{textBeforeUrl || "Link:"}</span>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#1DB954] hover:text-white underline inline-flex items-center gap-0.5 truncate max-w-xs sm:max-w-md md:max-w-full text-[11px]">
                              <span>{url}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          </div>
                        );
                      }
                      return <span key={idx} className="block text-white/60 text-[11px]">{line}</span>;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
 
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-3">
            {/* Left Column: Stream & Purchase Outlet List */}
            <div className="lg:col-span-7 space-y-2">
              <span className="text-[10px] font-mono font-black tracking-widest text-[#1DB954] uppercase block flex items-center gap-1.5 mb-2">
                <span>🛒 DIGITAL STORES & STREAM NETWORKS</span>
              </span>

              <div id="stores-linktree-stack" className="space-y-1.5">
                {[
                  {
                    name: "Spotify",
                    vibe: "Official Curated Stream",
                    action: "Stream Now",
                    url: track.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(track.artist + " " + track.title)}`,
                    badge: "STREAM",
                    baseColor: "hover:bg-[#1DB954]/5 hover:border-[#1DB954]/25 border-white/5",
                    iconColor: "text-[#1DB954]",
                    dot: "🟢"
                  },
                  {
                    name: "Beatport Store",
                    vibe: "Download Lossless WAV / AIFF",
                    action: "Buy Audio",
                    url: `https://www.beatport.com/search?q=${encodeURIComponent(track.artist + " " + track.title)}`,
                    badge: "DJ TRACK",
                    baseColor: "hover:bg-teal-500/5 hover:border-teal-500/25 border-white/5",
                    iconColor: "text-teal-400",
                    dot: "🎧"
                  },
                  {
                    name: "Bandcamp",
                    vibe: "Support Artist & Projects Direct",
                    action: "Search Store",
                    url: `https://bandcamp.com/search?q=${encodeURIComponent(track.artist + " " + track.title)}`,
                    badge: "CREATIVE",
                    baseColor: "hover:bg-sky-500/5 hover:border-sky-500/25 border-white/5",
                    iconColor: "text-sky-450",
                    dot: "⛺"
                  },
                  {
                    name: "Apple Music",
                    vibe: "Listen in High-Fidelity Lossless",
                    action: "Stream / Buy",
                    url: `https://music.apple.com/us/search?term=${encodeURIComponent(track.artist + " " + track.title)}`,
                    badge: "ALBUM",
                    baseColor: "hover:bg-rose-500/5 hover:border-rose-500/25 border-white/5",
                    iconColor: "text-rose-400",
                    dot: "🍎"
                  },
                  {
                    name: "SoundCloud",
                    vibe: "Stream Underground Live Sets",
                    action: "Discover Cuts",
                    url: `https://soundcloud.com/search?q=${encodeURIComponent(track.artist + " " + track.title)}`,
                    badge: "REMIXES",
                    baseColor: "hover:bg-orange-500/5 hover:border-orange-500/25 border-white/5",
                    iconColor: "text-orange-400",
                    dot: "☁️"
                  },
                  {
                    name: "YouTube Music",
                    vibe: "Watch Videos & Audio Visualizers",
                    action: "Watch Track",
                    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(track.artist + " " + track.title + " audio")}`,
                    badge: "VIDEO",
                    baseColor: "hover:bg-red-500/5 hover:border-red-500/25 border-white/5",
                    iconColor: "text-red-400",
                    dot: "🔴"
                  },
                  {
                    name: "Juno Download",
                    vibe: "Classic Track Vinyl & DJ Wax",
                    action: "Get DJ MP3",
                    url: `https://www.junodownload.com/search/?q=${encodeURIComponent(track.artist + " " + track.title)}`,
                    badge: "VINYL",
                    baseColor: "hover:bg-yellow-500/5 hover:border-yellow-500/25 border-white/5",
                    iconColor: "text-yellow-400",
                    dot: "📀"
                  }
                ].map((store, i) => (
                  <a
                    key={i}
                    href={store.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between p-2.5 rounded bg-black/40 border transition-all text-xs font-mono select-none ${store.baseColor}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm shrink-0">{store.dot}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-black uppercase tracking-tight text-white/95 ${store.iconColor}`}>{store.name}</span>
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-white/40">{store.badge}</span>
                        </div>
                        <p className="text-[10px] text-white/40 truncate hidden sm:block font-sans mt-0.5">{store.vibe}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-white/50 group-hover:text-white shrink-0 text-[10px] font-black uppercase tracking-wider">
                      <span>{store.action}</span>
                      <ExternalLink className="w-3 h-3 text-[#1DB954]" />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Right Column: SEO Keywords & Sharing Actions */}
            <div className="lg:col-span-12 xl:col-span-5 lg:mt-0 space-y-4">
              {/* SEO Tag Copier */}
              <div className="space-y-2">
                <span className="text-[9px] font-mono font-black tracking-widest text-[#1DB954] uppercase block">Climb Search Rankings (SEO Keywords)</span>
                <div className="flex flex-wrap gap-1.5 bg-black/40 p-3 rounded border border-white/5 max-h-[140px] overflow-y-auto">
                  {track.focusKeywords.map((kw, idx) => (
                    <button
                      key={idx}
                      onClick={() => copyKeywordToClipboard(kw)}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-white/80 hover:text-white hover:bg-white/10 transition-colors uppercase font-mono font-bold"
                    >
                      <span>{kw}</span>
                      {copiedKeyword === kw ? (
                        <Check className="w-2.5 h-2.5 text-[#1DB954]" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 opacity-60 text-white/50" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Sharing options */}
              <div className="space-y-2">
                <span className="text-[9px] font-mono font-black tracking-widest text-white/50 uppercase block">Share Digital Card URL</span>
                
                {/* Canonical Track Slug Link */}
                <div className="flex items-center justify-between text-[10px] font-mono bg-black/60 px-2.5 py-1.5 rounded border border-white/5 text-white/50">
                  <span className="text-[#1DB954] font-bold uppercase tracking-wider text-[9px]">Slug:</span>
                  <span className="truncate max-w-[210px] text-white/70">/track/{track.slug || track.id}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-black/40 p-3 rounded border border-white/5">
                  <button
                    onClick={() => handleShare("twitter")}
                    className="inline-flex items-center gap-1.5 justify-center py-2 px-3 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-mono font-bold hover:bg-sky-500/20 transition-colors uppercase tracking-wider"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Twitter</span>
                  </button>

                  <button
                    onClick={() => handleShare("whatsapp")}
                    className="inline-flex items-center gap-1.5 justify-center py-2 px-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold hover:bg-emerald-500/20 transition-colors uppercase tracking-wider"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleShare("clipboard")}
                    className="col-span-2 inline-flex items-center gap-1.5 justify-center py-2 px-3 rounded bg-white/5 border border-white/10 text-white/80 text-[10px] font-mono font-bold hover:bg-white/10 transition-colors uppercase tracking-wider"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#1DB954]" />
                        <span className="text-[#1DB954]">COPIED SHARE DATA!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-white/50" />
                        <span>COPY SHARE LINK</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
