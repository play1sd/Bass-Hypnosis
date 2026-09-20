import React, { useState, useEffect } from "react";
import { Check, X, ShieldAlert, Sparkles, AlertCircle, BarChart3, Database, ThumbsUp, Activity, Lock, RefreshCw, Key, ArrowRight, Loader, Trash2, Edit, Save, FileText, Globe, ExternalLink } from "lucide-react";
import { Submission, Analytics, Song } from "../types";

interface AdminPanelProps {
  onTracksUpdated: () => void;
}

export default function AdminPanel({ onTracksUpdated }: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Track Catalog Database Editor States
  const [activeTab, setActiveTab] = useState<"submissions" | "catalog">("catalog");
  const [tracks, setTracks] = useState<Song[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [trackEditForm, setTrackEditForm] = useState<Partial<Song>>({});
  const [isBulkExtracting, setIsBulkExtracting] = useState(false);
  const [bulkExtractSuccess, setBulkExtractSuccess] = useState<string | null>(null);
  const [isSingleExtractingId, setIsSingleExtractingId] = useState<string | null>(null);
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null);

  // States for live AI song optimization
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [editingTracks, setEditingTracks] = useState<{ [id: string]: {
    bpm: number;
    key: string;
    energyScore: number;
    seoDescription: string;
    reviewQuote: string;
    focusKeywords: string;
    isOptimized: boolean;
  }}>({});

  // Fetch admin tracks catalog
  const fetchTracks = async () => {
    try {
      const res = await fetch("/api/admin/tracks");
      if (res.ok) {
        const data = await res.json();
        setTracks(data);
      }
    } catch (e) {
      console.error("Failed to fetch admin tracks catalog", e);
    }
  };

  // Fetch admin queue and analytics
  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [subsRes, anaRes] = await Promise.all([
        fetch("/api/submissions"),
        fetch("/api/analytics")
      ]);

      if (subsRes.ok && anaRes.ok) {
        const subs = await subsRes.json();
        const ana = await anaRes.json();
        setSubmissions(subs);
        setAnalytics(ana);
      }
      
      await fetchTracks();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminData();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple secure sandbox lock
    if (adminPassword.trim() === "psytrance2026") {
      setIsAuthenticated(true);
      setLoginError(null);
    } else {
      setLoginError("Incorrect Admin Access Key. (Hint: psytrance2026)");
    }
  };

  // Call Gemini through API proxy to compile SEO summaries and track metadata
  const handleAIEnhance = async (sub: Submission) => {
    setOptimizingId(sub.id);
    try {
      const res = await fetch("/api/gemini/curate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sub.title,
          artist: sub.artist,
          vibeText: sub.vibeText
        })
      });

      if (res.ok) {
        const aiData = await res.json();
        
        setEditingTracks(prev => ({
          ...prev,
          [sub.id]: {
            bpm: aiData.bpm || 122,
            key: aiData.key || "D Minor",
            energyScore: 8,
            seoDescription: aiData.seoBrief || `Discover "${sub.title}" by ${sub.artist}. Highly optimized progressive track profile.`,
            reviewQuote: aiData.reviewerQuote || `Lead Editor Pick: An extremely powerful addition showcasing dynamic low-frequency oscillations.`,
            focusKeywords: Array.isArray(aiData.focusKeywords) 
              ? aiData.focusKeywords.join(", ") 
              : `${sub.artist}, ${sub.title}, Progressive House, Bass Hypnosis`,
            isOptimized: true
          }
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setOptimizingId(null);
    }
  };

  // Submit approved config to registry
  const handleApprove = async (sub: Submission) => {
    // Fill with default fallback if they didn't run AI Enhancer
    const edits = editingTracks[sub.id] || {
      bpm: 122,
      key: "D Minor",
      energyScore: 8,
      seoDescription: `Examine the hypnotic design of ${sub.title} by ${sub.artist}. This progressive cut adds deep atmospheric soundscapes to Bass Hypnosis.`,
      reviewQuote: `Approved community submission from ${sub.submitterName}! "Beautifully fits the hypnotic structure of late-night sets."`,
      focusKeywords: `${sub.artist}, ${sub.title}, Progressive House, Bass Hypnosis 2026`,
      isOptimized: false
    };

    try {
      const res = await fetch(`/api/submissions/${sub.id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bpm: edits.bpm,
          key: edits.key,
          energyScore: edits.energyScore,
          seoDescription: edits.seoDescription,
          reviewQuote: edits.reviewQuote,
          focusKeywords: edits.focusKeywords.split(",").map(k => k.trim())
        })
      });

      if (res.ok) {
        fetchAdminData();
        onTracksUpdated(); // Trigger homepage re-fetch in parent
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Decline submission
  const handleDecline = async (id: string) => {
    try {
      const res = await fetch(`/api/submissions/${id}/decline`, {
        method: "PUT"
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Start Editing Track details in local form
  const handleEditTrackClick = (track: Song) => {
    setEditingTrackId(track.id);
    setTrackEditForm({
      ...track,
      focusKeywords: Array.isArray(track.focusKeywords) ? track.focusKeywords : []
    });
    setCatalogMessage(null);
  };

  // Save Track edited details to API
  const handleSaveTrackEdit = async (trackId: string) => {
    try {
      const res = await fetch(`/api/admin/tracks/${trackId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...trackEditForm,
          focusKeywords: typeof trackEditForm.focusKeywords === "string"
            ? (trackEditForm.focusKeywords as string).split(",").map(k => k.trim()).filter(Boolean)
            : trackEditForm.focusKeywords
        })
      });

      if (res.ok) {
        setEditingTrackId(null);
        setCatalogMessage("✓ Track updated successfully in live memory list.");
        fetchAdminData();
        onTracksUpdated();
        setTimeout(() => setCatalogMessage(null), 3500);
      }
    } catch (e) {
      console.error("Failed to edit track", e);
      setCatalogMessage("✗ Optimization save failed.");
    }
  };

  // Perform a single track AI metadata extraction on fields
  const handleSingleAIExtract = async (track: Song) => {
    setIsSingleExtractingId(track.id);
    try {
      const res = await fetch("/api/gemini/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: track.title,
          artist: track.artist,
          spotifyUrl: track.spotifyUrl
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTrackEditForm(prev => ({
          ...prev,
          artistBio: data.artistBio || prev.artistBio,
          aboutTrack: data.aboutTrack || prev.aboutTrack,
          trackLinks: data.trackLinks || prev.trackLinks
        }));
        setCatalogMessage("✨ AI successfully extracted bio + platforms.");
        setTimeout(() => setCatalogMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
      setCatalogMessage("✗ AI single extraction failed.");
    } finally {
      setIsSingleExtractingId(null);
    }
  };

  // Remove track from list
  const handleDeleteTrack = async (trackId: string) => {
    try {
      const res = await fetch(`/api/admin/tracks/${trackId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setCatalogMessage("✓ Track deleted from list.");
        fetchAdminData();
        onTracksUpdated();
        setTimeout(() => setCatalogMessage(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Perform bulk AI metadata extraction loop
  const handleBulkAIExtract = async () => {
    setIsBulkExtracting(true);
    setBulkExtractSuccess(null);
    try {
      const res = await fetch("/api/gemini/extract-all-tracks", {
        method: "POST"
      });

      if (res.ok) {
        const result = await res.json();
        setBulkExtractSuccess(`⚡ Bulk extraction completed successfully! Analyzed & enriched metadata for all ${result.count || tracks.length} active tracks in memory.`);
        fetchAdminData();
        onTracksUpdated();
        setTimeout(() => setBulkExtractSuccess(null), 10000);
      }
    } catch (e) {
      console.error(e);
      setBulkExtractSuccess("✗ Bulk AI Extraction failed.");
    } finally {
      setIsBulkExtracting(false);
    }
  };

  // Helper values to draw bar widths for analytics
  const getMaxGenreCount = () => {
    if (!analytics || !analytics.genreDistribution) return 1;
    const counts = Object.values(analytics.genreDistribution) as number[];
    return Math.max(...counts, 1);
  };

  if (!isAuthenticated) {
    return (
      <div id="admin-login-lock" className="rounded bg-[#0a0a0a] border border-white/10 p-6 md:p-8 max-w-md mx-auto text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-24 h-24 bg-[#1DB954]/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="w-12 h-12 rounded bg-white/5 border border-white/10 text-[#1DB954] flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5" />
        </div>
        
        <h4 className="font-display text-xs font-black tracking-widest text-[#1DB954] uppercase mb-2">Editor Security Gateway</h4>
        <p className="text-xs text-white/60 leading-relaxed mb-5 font-sans">
          Unlock curator tools to moderate community recommendations, generate AI SEO metadata briefs, and analyze real-time channel metrics.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          {loginError && (
            <div className="p-2.5 rounded bg-red-950/20 border border-red-500/20 text-[10px] text-red-300 flex items-center gap-1.5 text-left justify-center">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}
          
          <div className="space-y-1 text-left">
            <div className="flex justify-between items-center text-[9px] font-mono text-white/40 uppercase font-bold">
              <span>Access Password Key</span>
              <span className="text-white/30">Authorized Personnel Only</span>
            </div>
            <input
              type="password"
              placeholder="••••••••••••"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full text-xs text-center font-mono rounded bg-black border border-white/10 focus:border-[#1DB954] focus:outline-none p-2.5 text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded bg-[#1DB954] hover:bg-[#1ed760] text-black font-mono text-xs font-black tracking-widest uppercase transition-all duration-300"
          >
            <span>VALIDATE KEY & ENTER</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div id="admin-dashboard-container" className="space-y-6">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded bg-[#0a0a0a] border border-white/10">
        <div>
          <h3 className="font-display text-base font-black tracking-widest text-[#1DB954] uppercase italic">Lead Curation Dashboard</h3>
          <p className="text-xs text-white/50 mt-1 font-mono">Logged in as Executive Curator & Editor-in-Chief @ PlayLSD</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminData}
            disabled={isLoading}
            className="p-2 rounded bg-white/5 border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-4 py-2 rounded bg-white/5 border border-white/10 text-[10px] font-mono font-bold hover:bg-white/10 hover:text-white transition-colors uppercase tracking-wider"
          >
            Logout session
          </button>
        </div>
      </div>

      {/* 2. Top Analytics Bento Widgets */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded bg-[#0a0a0a] border border-white/10">
            <span className="block text-[9px] font-mono tracking-widest font-black text-white/40 uppercase">Active Tracks</span>
            <span className="block text-2xl font-mono font-bold text-white mt-1">{analytics.totalActiveSongs}</span>
            <div className="flex items-center gap-1 text-[9px] text-[#1DB954] font-mono mt-1 font-bold">
              <Database className="w-3 h-3" />
              <span className="uppercase">{analytics.customSubmissionsCount} submissions live</span>
            </div>
          </div>

          <div className="p-4 rounded bg-[#0a0a0a] border border-white/10">
            <span className="block text-[9px] font-mono tracking-widest font-black text-white/40 uppercase">Pending Submissions</span>
            <span className="block text-2xl font-mono font-bold text-yellow-500 mt-1">{analytics.pendingCount}</span>
            <div className="flex items-center gap-1 text-[9px] text-yellow-500 font-mono mt-1 font-bold">
              <Activity className="w-3 h-3 animate-pulse" />
              <span className="uppercase">Awaiting review</span>
            </div>
          </div>

          <div className="p-4 rounded bg-[#0a0a0a] border border-white/10">
            <span className="block text-[9px] font-mono tracking-widest font-black text-white/40 uppercase font-bold">Public Engagement</span>
            <span className="block text-2xl font-mono font-bold text-[#1DB954] mt-1">{analytics.totalVotesOnSite}</span>
            <div className="flex items-center gap-1 text-[9px] text-[#1DB954] font-mono mt-1 font-bold">
              <ThumbsUp className="w-3 h-3 text-[#1DB954]" />
              <span className="uppercase">Upvote submissions</span>
            </div>
          </div>

          <div className="p-4 rounded bg-[#0a0a0a] border border-white/10">
            <span className="block text-[9px] font-mono tracking-widest font-black text-white/40 uppercase">Energy Density</span>
            <span className="block text-2xl font-mono font-bold text-pink-400 mt-1">{analytics.avgEnergy}/10</span>
            <div className="flex items-center gap-1 text-[9px] text-pink-400 font-mono mt-1 font-bold">
              <BarChart3 className="w-3 h-3 text-pink-400" />
              <span className="uppercase">Dynamic average</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Subgenre Demography Graphic Bars */}
      {analytics && analytics.genreDistribution && (
        <div className="p-5 rounded bg-[#0a0a0a] border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#1DB954]" />
            <h4 className="font-display text-xs font-black tracking-widest text-white uppercase">Active Subgenre Demographics</h4>
          </div>
          <div className="space-y-3.5">
            {Object.entries(analytics.genreDistribution).map(([genre, count]) => {
              const countNum = count as number;
              const pct = (countNum / getMaxGenreCount()) * 100;
              return (
                <div key={genre} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-mono uppercase font-bold">
                    <span className="text-white/70">{genre}</span>
                    <span className="text-[#1DB954]">{countNum} song{countNum > 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-2 rounded bg-black overflow-hidden border border-white/5">
                    <div
                      className="h-full rounded bg-[#1DB954] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Switching Menu */}
      <div className="flex border-b border-white/10 gap-2 mb-2">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex-1 py-3 text-center text-xs font-mono font-black tracking-widest uppercase transition-colors outline-none cursor-pointer border-b-2 font-bold ${
            activeTab === "catalog"
              ? "border-[#1DB954] text-[#1DB954] bg-[#1DB954]/5"
              : "border-transparent text-white/45 hover:text-white"
          }`}
        >
          📁 Playlist Tracks registry ({tracks.length})
        </button>
        <button
          onClick={() => setActiveTab("submissions")}
          className={`flex-1 py-3 text-center text-xs font-mono font-black tracking-widest uppercase transition-colors outline-none cursor-pointer border-b-2 font-bold ${
            activeTab === "submissions"
              ? "border-b-2 border-yellow-500 text-yellow-500 bg-yellow-500/5"
              : "border-transparent text-white/45 hover:text-white"
          }`}
        >
          📬 Submissions Queue ({submissions.filter(s => s.status === "pending").length})
        </button>
      </div>

      {catalogMessage && (
        <div className="p-3.5 rounded bg-blue-950/20 border border-blue-500/20 text-xs text-blue-300 font-mono flex items-center gap-2">
          <span>{catalogMessage}</span>
        </div>
      )}

      {bulkExtractSuccess && (
        <div className="p-4 rounded bg-[#101010] border border-purple-500/30 text-xs text-purple-300 font-mono space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-[#1DB954]">
            <Sparkles className="w-4 h-4 text-[#1DB954]" />
            <span>AI EXTRACTION SUCCESSFUL</span>
          </p>
          <p>{bulkExtractSuccess}</p>
        </div>
      )}

      {activeTab === "submissions" ? (
        /* 4. Enqueued Submissions Interactive Table */
        <div className="rounded bg-[#0a0a0a] border border-white/10 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-yellow-500" />
              <h4 className="font-display text-xs font-black tracking-widest text-white uppercase">Active Submissions Queue</h4>
            </div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/40">SORT BY: EARLIEST SUBMITTED FIRST</span>
          </div>

          {submissions.length === 0 ? (
            <div className="py-12 text-center text-white/40 font-mono">
              <p className="text-sm font-sans">No community track submissions available in historical logs.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {submissions.map((sub) => {
                const edit = editingTracks[sub.id];
                const isOptimizing = optimizingId === sub.id;

                return (
                  <div key={sub.id} className="p-4 md:p-5 hover:bg-black/20 transition-colors space-y-4">
                    
                    {/* Submission Header Info */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/5 uppercase font-bold tracking-widest mb-1.5">
                          SUB_ID: {sub.id}
                        </span>
                        <h4 className="font-display text-sm font-black text-white uppercase italic tracking-tight">{sub.title}</h4>
                        <p className="text-xs text-white/60 font-mono mt-0.5">{sub.artist}</p>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono mt-2 text-white/30 uppercase font-bold">
                          <div><strong className="text-white/60">Vibe Selection:</strong> {sub.subgenre}</div>
                          <div><strong className="text-white/60">By:</strong> {sub.submitterName} ({sub.submitterEmail})</div>
                        </div>
                      </div>

                      {/* Quick action buttons & states */}
                      <div className="flex items-center gap-2">
                        {sub.status === "pending" ? (
                          <>
                            <button
                              onClick={() => handleAIEnhance(sub)}
                              disabled={isOptimizing}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/20 text-[#1DB954] text-[10px] font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer"
                            >
                              {isOptimizing ? (
                                <>
                                  <Loader className="w-3 h-3 animate-spin text-[#1DB954]" />
                                  <span>Curating with AI...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
                                  <span>Gemini AI Optimize</span>
                                </>
                              )}
                            </button>
                            
                            <button
                              onClick={() => handleDecline(sub.id)}
                              className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 transition-colors cursor-pointer"
                              title="Decline Track"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono uppercase font-black ${
                            sub.status === "approved"
                              ? "bg-[#1DB954]/10 border border-[#1DB954]/20 text-[#1DB954]"
                              : "bg-red-500/10 border border-red-500/20 text-red-400"
                          }`}>
                            {sub.status === "approved" ? "APPROVED & LIVE" : "DECLINED"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Submitter text description */}
                    <div className="text-xs text-white/70 leading-relaxed font-sans bg-black/40 p-3.5 rounded border border-white/5">
                      <span className="text-[9px] font-mono uppercase text-white/40 tracking-widest font-black block mb-1">Curation Pitch Notes:</span>
                      "{sub.vibeText}"
                    </div>

                    {/* AI Generated SEO Panel Block */}
                    {edit && (
                      <div className="p-4 rounded bg-black border border-[#1DB954]/25 text-xs space-y-4">
                        <div className="flex items-center gap-1.5 pb-2 border-b border-white/10">
                          <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
                          <h5 className="font-display font-black tracking-widest text-[#1DB954] uppercase">Compiled Gemini AI SEO Blueprint</h5>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest font-bold block">Estimated BPM</label>
                            <input
                              type="number"
                              value={edit.bpm}
                              onChange={(e) => setEditingTracks(prev => ({
                                ...prev,
                                [sub.id]: { ...edit, bpm: Number(e.target.value) }
                              }))}
                              className="w-full text-xs font-mono rounded bg-[#0a0a0a] border border-white/10 p-2 text-white placeholder-white/20 focus:outline-none focus:border-[#1DB954]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest font-bold block">Harmonic Key</label>
                            <input
                              type="text"
                              value={edit.key}
                              onChange={(e) => setEditingTracks(prev => ({
                                ...prev,
                                [sub.id]: { ...edit, key: e.target.value }
                              }))}
                              className="w-full text-xs font-mono rounded bg-[#0a0a0a] border border-white/10 p-2 text-white placeholder-white/20 focus:outline-none focus:border-[#1DB954]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest font-bold block">Energy Rating (1-10)</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={edit.energyScore}
                              onChange={(e) => setEditingTracks(prev => ({
                                ...prev,
                                [sub.id]: { ...edit, energyScore: Number(e.target.value) }
                              }))}
                              className="w-full text-xs font-mono rounded bg-[#0a0a0a] border border-white/10 p-2 text-white placeholder-white/20 focus:outline-none focus:border-[#1DB954]"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest font-bold block">Keyword Rich SEO Blurb</label>
                          <textarea
                            rows={3}
                            value={edit.seoDescription}
                            onChange={(e) => setEditingTracks(prev => ({
                              ...prev,
                              [sub.id]: { ...edit, seoDescription: e.target.value }
                            }))}
                            className="w-full text-xs font-sans rounded bg-[#0a0a0a] border border-white/10 p-2 text-white placeholder-white/20 focus:outline-none focus:border-[#1DB954] resize-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest font-bold block">Curation Commentary / Notes</label>
                          <textarea
                            rows={2}
                            value={edit.reviewQuote}
                            onChange={(e) => setEditingTracks(prev => ({
                              ...prev,
                              [sub.id]: { ...edit, reviewQuote: e.target.value }
                            }))}
                            className="w-full text-xs font-sans rounded bg-[#0a0a0a] border border-white/10 p-2 text-white italic placeholder-white/20 focus:outline-none focus:border-[#1DB954] resize-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest font-bold block">Highly Targeted SEO Tags (comma separated)</label>
                          <input
                            type="text"
                            value={edit.focusKeywords}
                            onChange={(e) => setEditingTracks(prev => ({
                              ...prev,
                              [sub.id]: { ...edit, focusKeywords: e.target.value }
                            }))}
                            className="w-full text-xs font-mono rounded bg-[#0a0a0a] border border-white/10 p-2 text-white placeholder-white/20 focus:outline-none focus:border-[#1DB954]"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                          <button
                            onClick={() => handleApprove(sub)}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded bg-[#1DB954] hover:bg-[#1ed760] text-black font-mono text-[10px] font-black tracking-widest uppercase transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>PUBLISH AND RELEASE</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Standard Approving buttons if Gemini is not yet invoked */}
                    {!edit && sub.status === "pending" && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleApprove(sub)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#1DB954]/15 border border-[#1DB954]/30 text-[#1DB954] font-mono font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>PREVIEW & APPROVE DIRECTLY</span>
                        </button>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Playlist Tracks Registry Tab */
        <div className="rounded bg-[#0a0a0a] border border-white/10 overflow-hidden space-y-4 p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h4 className="font-display text-sm font-black tracking-widest text-[#1DB954] uppercase flex items-center gap-2">
                <Database className="w-4 h-4 text-[#1DB954]" />
                <span>Playlist Registry Editor</span>
              </h4>
              <p className="text-xs text-white/50 mt-1">
                Edit detailed biographies, compositions writeups, links metadata, tempo traits, and upvotes for standard & custom entries.
              </p>
            </div>

            <button
              onClick={handleBulkAIExtract}
              disabled={isBulkExtracting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-mono text-xs font-black tracking-widest uppercase transition-all duration-300 cursor-pointer"
            >
              {isBulkExtracting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin text-white" />
                  <span>EXTRACTING PLAYLIST DATA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>✨ BULK AI AUTO-EXTRACT PLAYLIST</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Search across all 100 catalog tracks */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-xs font-mono text-white/50">
              Total Tracks Registered: <strong className="text-white">{tracks.length}</strong>
            </span>
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search track, artist, or genre..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full text-xs font-sans rounded bg-black border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-[#1DB954]"
              />
            </div>
          </div>

          <div className="space-y-4">
            {tracks.length === 0 ? (
              <div className="py-12 text-center text-white/40 font-mono">
                <p className="text-sm font-sans">No loaded playlist tracks available in active state memory.</p>
              </div>
            ) : (
              <div className="space-y-4 divide-y divide-white/5">
                {tracks
                  .filter(track => {
                    const query = catalogSearch.toLowerCase().trim();
                    if (!query) return true;
                    return (
                      track.title.toLowerCase().includes(query) ||
                      track.artist.toLowerCase().includes(query) ||
                      (track.subgenre || "").toLowerCase().includes(query) ||
                      (track.key || "").toLowerCase().includes(query)
                    );
                  })
                  .map((track) => {
                  const isEditing = editingTrackId === track.id;

                  return (
                    <div key={track.id} className="pt-4 first:pt-0 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/20 font-bold uppercase">
                              {track.subgenre || "No Subgenre"}
                            </span>
                            <span className="text-[9px] font-mono text-white/45 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                              {track.bpm} BPM • {track.key}
                            </span>
                            {track.isCustomSubmission && (
                              <span className="text-[9px] font-mono text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20 uppercase font-bold">
                                SUBMISSION
                              </span>
                            )}
                          </div>
                          
                          <h5 className="font-display text-sm font-black text-white uppercase italic tracking-wider mt-1.5">{track.title}</h5>
                          <p className="text-xs text-white/60 font-mono">{track.artist}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditTrackClick(track)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/90 font-mono cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit Detail</span>
                          </button>
                          
                          <button
                            onClick={() => handleDeleteTrack(track.id)}
                            className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors cursor-pointer"
                            title="Delete track"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Display summary values */}
                      {!isEditing && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-black/40 p-3 rounded border border-white/5 text-[11px] font-sans text-white/70">
                          <div className="space-y-0.5">
                            <span className="block text-[8px] font-mono uppercase text-pink-400 tracking-wider font-bold">Artist Bio</span>
                            <p className="line-clamp-2">{track.artistBio || "—"}</p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="block text-[8px] font-mono uppercase text-[#1DB954] tracking-wider font-bold">About Track</span>
                            <p className="line-clamp-2">{track.aboutTrack || "—"}</p>
                          </div>
                          <div className="space-y-0.5 leading-relaxed font-mono text-[10px] max-w-full overflow-hidden truncate">
                            <span className="block text-[8px] font-sans uppercase text-yellow-400 tracking-wider font-bold">Extracted links</span>
                            <p className="line-clamp-2 italic">{track.trackLinks || "—"}</p>
                          </div>
                        </div>
                      )}

                      {/* Inline active track editor */}
                      {isEditing && (
                        <div className="p-4 rounded border border-[#1DB954]/30 bg-black space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
                              <h6 className="font-display font-black tracking-widest text-[#1DB954] uppercase text-xs">Curation Console</h6>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => handleSingleAIExtract(track)}
                              disabled={isSingleExtractingId !== null}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/20 text-[#1DB954] text-[10px] font-mono uppercase font-black transition-colors cursor-pointer"
                            >
                              {isSingleExtractingId === track.id ? (
                                <>
                                  <Loader className="w-3 h-3 animate-spin" />
                                  <span>Extracting...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3" />
                                  <span>✨ AI Extract Artist & Track Info</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-white/40 uppercase font-black">Track title</label>
                              <input
                                type="text"
                                value={trackEditForm.title || ""}
                                onChange={(e) => setTrackEditForm({ ...trackEditForm, title: e.target.value })}
                                className="w-full text-xs font-mono rounded bg-[#0a0a0a] border border-white/10 p-2 text-white focus:outline-none focus:border-[#1DB954]"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-white/40 uppercase font-black">Artist / Project Name</label>
                              <input
                                type="text"
                                value={trackEditForm.artist || ""}
                                onChange={(e) => setTrackEditForm({ ...trackEditForm, artist: e.target.value })}
                                className="w-full text-xs font-mono rounded bg-[#0a0a0a] border border-white/10 p-2 text-white focus:outline-none focus:border-[#1DB954]"
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-2 md:col-span-2">
                              <div className="space-y-1">
                                <label className="text-[9px] font-mono text-white/40 uppercase font-black">BPM</label>
                                <input
                                  type="number"
                                  value={trackEditForm.bpm || 122}
                                  onChange={(e) => setTrackEditForm({ ...trackEditForm, bpm: Number(e.target.value) })}
                                  className="w-full text-xs font-mono rounded bg-[#0a0a0a] border border-white/10 p-2 text-white focus:outline-none focus:border-[#1DB954]"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-mono text-white/40 uppercase font-black">Harmonic Key</label>
                                <input
                                  type="text"
                                  value={trackEditForm.key || ""}
                                  onChange={(e) => setTrackEditForm({ ...trackEditForm, key: e.target.value })}
                                  className="w-full text-xs font-mono rounded bg-[#0a0a0a] border border-white/10 p-2 text-white focus:outline-none focus:border-[#1DB954]"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-mono text-white/40 uppercase font-black">Energy Grade (1-10)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={trackEditForm.energyScore || 7}
                                  onChange={(e) => setTrackEditForm({ ...trackEditForm, energyScore: Number(e.target.value) })}
                                  className="w-full text-xs font-mono rounded bg-[#0a0a0a] border border-white/10 p-2 text-white focus:outline-none focus:border-[#1DB954]"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-white/40 uppercase font-black">Subgenre Vibe</label>
                              <input
                                type="text"
                                value={trackEditForm.subgenre || ""}
                                onChange={(e) => setTrackEditForm({ ...trackEditForm, subgenre: e.target.value })}
                                className="w-full text-xs font-sans rounded bg-[#0a0a0a] border border-white/10 p-2 text-white focus:outline-none focus:border-[#1DB954]"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-white/40 uppercase font-black">Spotify Album URL</label>
                              <input
                                type="text"
                                value={trackEditForm.spotifyUrl || ""}
                                onChange={(e) => setTrackEditForm({ ...trackEditForm, spotifyUrl: e.target.value })}
                                className="w-full text-xs font-mono rounded bg-[#0a0a0a] border border-white/10 p-2 text-white focus:outline-none focus:border-[#1DB954]"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-white/40 uppercase font-black block">✨ AI Artist Biography</span>
                            <textarea
                              rows={2}
                              value={trackEditForm.artistBio || ""}
                              onChange={(e) => setTrackEditForm({ ...trackEditForm, artistBio: e.target.value })}
                              placeholder="Describe the artist biography..."
                              className="w-full text-xs font-sans rounded bg-[#0a0a0a] border border-white/10 p-2.5 text-white focus:outline-none focus:border-[#1DB954]"
                            />
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-white/40 uppercase font-black block">✨ AI About Track Description</span>
                            <textarea
                              rows={2}
                              value={trackEditForm.aboutTrack || ""}
                              onChange={(e) => setTrackEditForm({ ...trackEditForm, aboutTrack: e.target.value })}
                              placeholder="Detailed writeup concerning synthesizer loops and soundscape geometry..."
                              className="w-full text-xs font-sans rounded bg-[#0a0a0a] border border-white/10 p-2.5 text-white focus:outline-none focus:border-[#1DB954]"
                            />
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-white/40 uppercase font-black block">⛓️ AI Extracted Platforms & Direct Links (One per line)</span>
                            <textarea
                              rows={3}
                              value={trackEditForm.trackLinks || ""}
                              onChange={(e) => setTrackEditForm({ ...trackEditForm, trackLinks: e.target.value })}
                              placeholder="Platform: [Link]"
                              className="w-full text-xs font-mono rounded bg-[#0a0a0a] border border-white/10 p-2.5 text-white focus:outline-none focus:border-[#1DB954]"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-white/40 uppercase font-black">Review Quote Preview</label>
                              <textarea
                                rows={2}
                                value={trackEditForm.reviewQuote || ""}
                                onChange={(e) => setTrackEditForm({ ...trackEditForm, reviewQuote: e.target.value })}
                                className="w-full text-xs font-sans rounded bg-[#0a0a0a] border border-white/10 p-2 text-white focus:outline-none focus:border-[#1DB954]"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-white/40 uppercase font-black">SEO Metadata Description</label>
                              <textarea
                                rows={2}
                                value={trackEditForm.seoDescription || ""}
                                onChange={(e) => setTrackEditForm({ ...trackEditForm, seoDescription: e.target.value })}
                                className="w-full text-xs font-sans rounded bg-[#0a0a0a] border border-white/10 p-2 text-white focus:outline-none focus:border-[#1DB954]"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                            <button
                              type="button"
                              onClick={() => setEditingTrackId(null)}
                              className="px-4 py-2 rounded bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-xs font-mono uppercase font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => handleSaveTrackEdit(track.id)}
                              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded bg-[#1DB954] hover:bg-[#1ed760] text-black font-mono text-xs font-black tracking-widest uppercase cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>SAVE UPDATES</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
