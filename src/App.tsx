import React, { useState, useEffect } from "react";
import { 
  Compass, 
  PlusCircle, 
  SlidersHorizontal, 
  HelpCircle, 
  Search, 
  Sparkles, 
  Music, 
  Disc, 
  TrendingUp, 
  Share2, 
  Check, 
  Copy,
  ChevronRight,
  ShieldCheck,
  Twitter,
  ExternalLink,
  Volume2
} from "lucide-react";
import SpotifyEmbed from "./components/SpotifyEmbed";
import TrackCard from "./components/TrackCard";
import SubmitSongForm from "./components/SubmitSongForm";
import AdminPanel from "./components/AdminPanel";
import NewsletterStation from "./components/NewsletterStation";
import { Song } from "./types";

export default function App() {
  const [tracks, setTracks] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubgenre, setSelectedSubgenre] = useState("All");
  const [selectedBpm, setSelectedBpm] = useState<string>("All");
  const [selectedSort, setSelectedSort] = useState<"upvotes" | "default">("default");
  
  // Single-page primary tab focus
  const [activeTab, setActiveTab] = useState<"discover" | "submit" | "admin">("discover");

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);

  // Fetch active curated tracks list from server-side database
  const fetchCuratedTracks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tracks");
      if (res.ok) {
        const data = await res.json();
        setTracks(data);
      }
    } catch (e) {
      console.error("Failed to fetch tracks", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Force trigger direct live playlist parsing from Spotify embed
  const handleSyncTracks = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/tracks/sync", { method: "POST" });
      if (res.ok) {
        await fetchCuratedTracks();
      }
    } catch (e) {
      console.error("Failed to sync dynamically from live embed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchCuratedTracks();
  }, []);

  // Handle SEO deep linking from slugged URLs (/track/:slug or ?track=:slug)
  useEffect(() => {
    if (tracks.length === 0) return;
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const slugFromPath = path.startsWith("/track/") 
      ? decodeURIComponent(path.replace("/track/", "")).replace(/\/$/, "") 
      : null;
    const slugFromQuery = searchParams.get("track");
    const targetSlug = slugFromPath || slugFromQuery;

    if (targetSlug) {
      const found = tracks.find(t => t.slug === targetSlug || t.id === targetSlug);
      if (found) {
        document.title = `${found.title} - ${found.artist} (${found.bpm} BPM, ${found.key}) | Bass Hypnosis 2026`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && found.seoDescription) {
          metaDesc.setAttribute("content", found.seoDescription);
        }
        setSearchQuery(found.title);
        setActiveTab("discover");
      }
    }
  }, [tracks]);

  // Update specific track upvotes count dynamically in React state
  const handleTrackUpvote = (id: string, updatedVotes: number) => {
    setTracks(prev =>
      prev.map(t => (t.id === id ? { ...t, upvotes: updatedVotes } : t))
    );
  };

  // Copy site URL helper
  const copySiteUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(`Bass Hypnosis 2026 - Progressive & Psytrance Curation Hub: ${url}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Only show tags/subgenres that are available in the current tracks
  const genresList = ["All", ...(Array.from(new Set(tracks.map(t => t.subgenre))).filter(Boolean) as string[])];

  // Only show BPM values that actually exist inside target playlist tracks
  const bpmList = ["All", ...(Array.from(new Set(tracks.map(t => Number(t.bpm)))).sort((a: number, b: number) => a - b).map(String))];

  // Collect some of the active keywords present across tracks for clicking to search
  const popularKeywords = (Array.from(new Set(tracks.flatMap(t => (t.focusKeywords || []) as string[]))).filter(Boolean) as string[]).slice(0, 10);

  // Perform multi-attribute search filtering (genres, bpms, search-queries)
  const filteredTracks = tracks
    .filter(track => {
      const matchGenre = selectedSubgenre === "All" || track.subgenre === selectedSubgenre;
      const matchBpm = selectedBpm === "All" || String(track.bpm) === selectedBpm;
      
      const textToSearch = `${track.title} ${track.artist} ${track.vibe} ${track.subgenre} ${track.focusKeywords?.join(" ") || ""}`.toLowerCase();
      const matchQuery = textToSearch.includes(searchQuery.toLowerCase().trim());
      
      return matchGenre && matchBpm && matchQuery;
    })
    .sort((a, b) => {
      if (selectedSort === "upvotes") {
        return b.upvotes - a.upvotes;
      }
      return 0; // maintain server sequence
    });

  useEffect(() => {
    setVisibleCount(25);
  }, [searchQuery, selectedSubgenre, selectedBpm, selectedSort]);

  const displayedTracks = filteredTracks.slice(0, visibleCount);

  return (
    <div className="min-h-screen flex flex-col relative bg-[#050505] text-white selection:bg-[#1DB954]/30 selection:text-white">
      
      {/* 1. Subtle Ambient Portal Gradients - Monochromatic Dark Hue */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[#1DB954]/3 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-[600px] h-[600px] rounded-full bg-white/2 blur-[150px] pointer-events-none" />

      {/* 2. Responsive Site Header with Big Italic Bold Typography & Global Stats */}
      <header id="app-header" className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-md border-b border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          
          {/* Brand Logo & Sync details in italic extreme tracking */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-[48px] sm:text-[60px] md:text-[72px] leading-[0.8] font-black tracking-tighter uppercase italic select-none">
                PLAYLSD<span className="text-[#1DB954]">.</span>
              </h1>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/80 border border-white/10 uppercase tracking-widest font-bold">HUB</span>
            </div>
            <p className="text-[10px] sm:text-xs tracking-[0.4em] uppercase text-white/40 mt-3 font-mono">BASS HYPNOSIS 2026 • GLOBAL CURATION</p>
          </div>

          {/* Navigation Controls & Spotify Stats Integration */}
          <div className="flex flex-wrap items-center gap-4">
            <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
              <button
                onClick={() => setActiveTab("discover")}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-mono font-bold tracking-wider transition-all duration-300 ${
                  activeTab === "discover"
                    ? "bg-[#1DB954] text-black font-extrabold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">DISCOVER</span>
                <span className="sm:hidden">PEAKS</span>
              </button>

              <button
                onClick={() => setActiveTab("submit")}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-mono font-bold tracking-wider transition-all duration-300 ${
                  activeTab === "submit"
                    ? "bg-[#1DB954] text-black font-extrabold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>SUBMIT</span>
              </button>

              <button
                onClick={() => setActiveTab("admin")}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-mono font-bold tracking-wider transition-all duration-300 ${
                  activeTab === "admin"
                    ? "bg-[#1DB954] text-black font-extrabold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-bold">CURATOR GATE</span>
                <span className="sm:hidden font-mono text-[10px]">ADMIN</span>
              </button>
            </nav>

            <div className="hidden sm:flex gap-6 items-center text-right font-mono border-l border-white/10 pl-5">
              <div>
                <p className="text-sm font-bold leading-none text-white">{tracks.length}</p>
                <p className="text-[9px] uppercase tracking-widest text-white/40 mt-1">Curated Tracks</p>
              </div>
              <div>
                <p className="text-sm font-bold leading-none text-[#1DB954]">2026</p>
                <p className="text-[9px] uppercase tracking-widest text-white/40 mt-1">Edition</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Promo Hero Banner - High-Impact Brutalist Typography */}
      <section id="hero-banner" className="relative overflow-hidden border-b border-white/10 bg-[#0a0a0a] py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs font-mono text-[#1DB954] tracking-widest uppercase font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
            <span>REAL-TIME CURATED SOUND TRACK HUB</span>
          </div>

          <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-none text-white uppercase max-w-5xl mx-auto italic">
            BASS HYPNOSIS: <span className="text-[#1DB954]">PSY & PROGRESSIVE</span>
          </h2>

          <p className="font-sans text-xs sm:text-sm text-white/60 leading-relaxed max-w-3xl mx-auto">
            Discover the official promotional portal of PlayLSD’s ultimate virtual audio compilation. High-voltage electronic structures, kinetic frequency sweeps, and rolling mid-range subbasses structured for study, work, and hypnotic states.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono px-4 py-2 rounded bg-black border border-white/10 text-white/80">
              <span className="w-2 h-2 rounded-full bg-[#1ed760] animate-pulse" />
              <span>{tracks.length} Curated Tracks</span>
            </div>
            
            <div className="inline-flex items-center gap-1.5 text-xs font-mono px-4 py-2 rounded bg-black border border-white/10 text-white/80">
              <TrendingUp className="w-4 h-4 text-[#1DB954]" />
              <span>Official Spotify Edition</span>
            </div>

            <button
              onClick={copySiteUrl}
              className="inline-flex items-center gap-2 px-6 py-2 rounded bg-[#1DB954] hover:bg-[#1ed760] text-black font-mono text-xs font-black tracking-wider transition-all duration-200 uppercase"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-black" />
                  <span>COPIED HUB LINK!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>SHARE THIS PORTAL</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 4. Main Tab Router Render Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === "discover" && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Top Row: Spotify Player */}
            <div className="w-full">
              <SpotifyEmbed />
            </div>

            {/* Compact Newsletter Dispatch Loop Integration */}
            <NewsletterStation isCompact={true} />

            {/* Curated Track Browser section */}
            <div id="curated-browser-workspace" className="space-y-6 pt-2">
              
              {/* Workspace Header with live sync control */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-xl font-black text-white uppercase flex items-center gap-2 tracking-tight italic">
                      <Music className="w-5 h-5 text-[#1DB954]" />
                      <span>Curated Track Encyclopedia</span>
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60">
                      {filteredTracks.length} / {tracks.length} Tracks
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mt-1">
                    Explore real-time electronic speed signatures, keys, and keywords extracted directly from the Spotify playlist.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Dynamic Live Extraction Sync Button */}
                  <button
                    onClick={handleSyncTracks}
                    disabled={isSyncing || isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 active:border-white/20 transition-all font-mono text-[11px] font-black uppercase text-white tracking-wider disabled:opacity-50 disabled:cursor-not-allowed group shrink-0"
                    title="Read live Spotify embed playlist tracks data"
                  >
                    <Disc className={`w-3.5 h-3.5 text-[#1DB954] ${isSyncing ? "animate-spin" : "group-hover:rotate-12 transition-transform"}`} />
                    <span>{isSyncing ? "Syncing Playlist..." : "Refresh Live Tracks"}</span>
                  </button>

                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value as any)}
                    className="text-xs font-mono font-bold rounded bg-black border border-white/10 p-2 text-white/80 focus:outline-none focus:border-[#1DB954] cursor-pointer"
                  >
                    <option value="default">Default Rotation</option>
                    <option value="upvotes">Highest Upvoted</option>
                  </select>
                </div>
              </div>

              {/* Redesigned Filter Dashboard Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 rounded bg-[#0a0a0a] border border-white/10">
                
                {/* 1. Dynamic Tags (Subgenres) - Column Span 5 */}
                <div className="md:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/40 uppercase font-black tracking-widest block">
                      Vibration Tags (Subgenres):
                    </span>
                    <span className="text-[9px] font-mono text-white/30">(Dynamic Cards Extraction)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {genresList.map(genre => (
                      <button
                        key={genre}
                        onClick={() => setSelectedSubgenre(genre)}
                        className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold border transition-all uppercase tracking-wider ${
                          selectedSubgenre === genre
                            ? "bg-[#1DB954]/10 border-[#1DB954] text-[#1DB954]"
                            : "bg-black/40 border-white/5 text-white/50 hover:text-white hover:border-white/20"
                        }`}
                      >
                        {genre === "All" ? "ALL TAGS" : genre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Dynamic BPM Speeds - Column Span 4 */}
                <div className="md:col-span-4 space-y-3 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/40 uppercase font-black tracking-widest block">
                      Audio Speeds (BPM):
                    </span>
                    <span className="text-[9px] font-mono text-[#1DB954] uppercase font-bold tracking-wider">Playlist Exist Only</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {bpmList.map(bpm => (
                      <button
                        key={bpm}
                        onClick={() => setSelectedBpm(bpm)}
                        className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold border transition-all tracking-wider ${
                          selectedBpm === bpm
                            ? "bg-[#1DB954]/10 border-[#1DB954] text-[#1DB954]"
                            : "bg-black/40 border-white/5 text-white/50 hover:text-white hover:border-white/20"
                        }`}
                      >
                        {bpm === "All" ? "ALL BPMS" : `${bpm} BPM`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Text Search & Popular Focus Keywords Clicks - Column Span 3 */}
                <div className="md:col-span-3 space-y-3 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-5">
                  <span className="text-[10px] font-mono text-white/40 uppercase font-black tracking-widest block">
                    Interactive Keyword Probe:
                  </span>
                  
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/30" />
                    <input
                      type="text"
                      placeholder="Keyword / artist / vibe..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs font-sans rounded bg-black border border-white/10 pl-8 pr-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-[#1DB954] transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-white/30 block">Quick Popular Searches:</span>
                    <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto pr-1">
                      {popularKeywords.map(keyword => (
                        <button
                          key={keyword}
                          onClick={() => setSearchQuery(keyword)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all ${
                            searchQuery.toLowerCase().trim() === keyword.toLowerCase().trim()
                              ? "bg-[#1DB954]/20 border-[#1DB954] text-white"
                              : "bg-black/20 border-white/5 text-white/40 hover:text-white "
                          }`}
                        >
                          #{keyword.split(" ").pop()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Active Filters Reset Ribbon Bar */}
              {(selectedSubgenre !== "All" || selectedBpm !== "All" || searchQuery) && (
                <div className="flex items-center justify-between p-3 rounded bg-[#1DB954]/5 border border-[#1DB954]/20">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-[#1DB954] uppercase font-black tracking-widest">Active Filters:</span>
                    {selectedSubgenre !== "All" && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#1DB954]/10 text-white border border-[#1DB954]/20 uppercase">
                        Tag: {selectedSubgenre}
                      </span>
                    )}
                    {selectedBpm !== "All" && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#1DB954]/10 text-white border border-[#1DB954]/20">
                        {selectedBpm} BPM
                      </span>
                    )}
                    {searchQuery && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#1DB954]/10 text-white border border-[#1DB954]/20 max-w-[150px] truncate">
                        Query: "{searchQuery}"
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSubgenre("All");
                      setSelectedBpm("All");
                      setSearchQuery("");
                    }}
                    className="text-[10px] font-mono font-black text-[#1DB954] hover:text-[#1ed760] transition-colors uppercase tracking-wider"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}

              {/* Curated Track Listings */}
              {isLoading ? (
                <div className="py-20 text-center space-y-3">
                  <Disc className="w-8 h-8 text-[#1DB954] animate-spin mx-auto" />
                  <p className="text-xs font-mono text-white/40 tracking-widest">SYNCHRONIZING AUDIO ENGINE DATABASE...</p>
                </div>
              ) : filteredTracks.length === 0 ? (
                <div className="py-16 text-center rounded bg-black border border-dashed border-white/10 text-white/50">
                  <p className="text-sm font-sans">No matching tracks found. Try searching for other vibes like "Maze 28", "Progressive House", or "122 BPM".</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {displayedTracks.map(track => (
                      <TrackCard
                        key={track.id}
                        track={track}
                        onUpvote={handleTrackUpvote}
                      />
                    ))}
                  </div>

                  {filteredTracks.length > visibleCount && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded bg-white/5 border border-white/10 font-mono text-xs mt-6">
                      <span className="text-white/60">
                        Showing <span className="text-white font-bold">{Math.min(visibleCount, filteredTracks.length)}</span> of <span className="text-[#1DB954] font-bold">{filteredTracks.length}</span> tracks in catalog
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setVisibleCount(prev => prev + 25)}
                          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white font-bold tracking-wider transition-all"
                        >
                          Load 25 More
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisibleCount(filteredTracks.length)}
                          className="px-4 py-2 rounded bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold tracking-wider transition-all"
                        >
                          Show All ({filteredTracks.length})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Newsletter Dispatch Loop Integration */}
            <NewsletterStation />

            {/* Quick Curation Guide Informational Accordion */}
            <div className="p-6 rounded bg-[#0a0a0a] border border-white/10 space-y-3">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#1DB954]" />
                <h4 className="font-display text-xs font-black tracking-widest text-[#1DB954] uppercase">Curation & SEO Architecture</h4>
              </div>
              <p className="text-xs text-white/60 leading-relaxed font-sans">
                Each track listed inherits custom metadata optimizations formulated using machine analysis. The key signatures and BPM ranges are specifically classified to match human beta waves. Click any song card to expand its SEO Profile and copy keywords directly.
              </p>
            </div>
          </div>
        )}

        {activeTab === "submit" && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div className="text-center space-y-2 pb-2">
              <h3 className="font-display text-4xl font-black uppercase tracking-tight text-white italic">CURATE THE WAVE<span className="text-[#1DB954]">.</span></h3>
              <p className="text-xs text-white/50 max-w-md mx-auto">Recommend high-frequency tracks to promote, refine, and grow the Bass Hypnosis official web representation.</p>
            </div>
            
            <SubmitSongForm onSuccess={fetchCuratedTracks} />
          </div>
        )}

        {activeTab === "admin" && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <AdminPanel onTracksUpdated={fetchCuratedTracks} />
          </div>
        )}

      </main>

      {/* 5. Clean Elegant Page Footer in Brutalist Styling */}
      <footer id="app-footer" className="bg-[#030303] border-t border-white/10 py-10 text-white/40 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1DB954]">PLAYLSD SYSTEMS</span>
            <span className="h-3 w-px bg-white/10" />
            <span className="font-mono">Bass Hypnosis Hub &copy; 2026</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://open.spotify.com/playlist/2sCu2R0XnUTw9na0ofT4vb"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wider text-xs"
            >
              <span>Spotify Playlist</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#1DB954]" />
            </a>
            
            <a
              href="/sitemap.json"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wider text-xs text-[#1DB954]"
            >
              <span>SEO SITEMAP (JSON)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => setActiveTab("admin")}
              className="hover:text-white transition-colors font-mono font-bold uppercase tracking-wider text-xs"
            >
              Curator Portal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
