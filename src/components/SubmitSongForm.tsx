import React, { useState } from "react";
import { Plus, Send, CheckCircle2, AlertCircle, Sparkles, HelpCircle } from "lucide-react";

interface SubmitSongFormProps {
  onSuccess: () => void;
}

export default function SubmitSongForm({ onSuccess }: SubmitSongFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    spotifyUrl: "",
    subgenre: "Progressive Psytrance",
    vibeText: "",
    submitterName: "",
    submitterEmail: ""
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "info" | "success" | "pending" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.artist || !formData.spotifyUrl) {
      setErrorMsg("Please fill out Title, Artist, and Spotify Link fields safely.");
      return;
    }

    // Browser-native transmission verification confirm dialog
    const isApproved = window.confirm(
      `TRANSMIT SYSTEM VERIFICATION:\n\nTrack Name: "${formData.title}"\nArtist / Project: "${formData.artist}"\n\nConfirm to transmit this record to the Bass Hypnosis curation processing engine?`
    );

    if (!isApproved) {
      return;
    }

    // Trigger simple custom status toast
    setToastMsg({
      text: "System processing track submission... standing by for validation.",
      type: "pending"
    });

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setToastMsg({
          text: `Success! "${formData.title}" is being processed by the system.`,
          type: "success"
        });
        
        // Retain toast for 4.5 seconds
        setTimeout(() => setToastMsg(null), 4500);

        setIsSuccess(true);
        setFormData({
          title: "",
          artist: "",
          spotifyUrl: "",
          subgenre: "Progressive Psytrance",
          vibeText: "",
          submitterName: "",
          submitterEmail: ""
        });
        onSuccess(); // refresh parent tracks database if needed
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Submission failed. Please check input parameters.");
        setToastMsg({
          text: `Error parsing track: ${data.error || "Input rejected"}`,
          type: "info"
        });
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Network error. Could not connect to the Curation Hub server.");
      setToastMsg({
        text: "Network transmission failure. Hub offline.",
        type: "info"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="submit-song-card" className="rounded bg-[#0a0a0a] border border-white/10 p-5 md:p-6 transition-all duration-300 hover:border-white/20 relative overflow-hidden group">
      
      {/* Dynamic Processing Status Toast */}
      {toastMsg && (
        <div 
          id="custom-curation-toast" 
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 rounded bg-[#080808] border border-[#1DB954]/40 shadow-2xl shadow-black/80 max-w-xs sm:max-w-sm transition-all duration-300 animate-slide-in-right"
        >
          {toastMsg.type === "pending" ? (
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-[#1DB954] animate-spin shrink-0" />
          ) : toastMsg.type === "success" ? (
            <div className="w-5 h-5 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="space-y-0.5">
            <span className="text-[9px] font-mono tracking-widest text-[#1DB954] font-black uppercase block">System Curation Link</span>
            <p className="text-[11px] text-white/90 font-mono leading-tight">{toastMsg.text}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setToastMsg(null)}
            className="text-white/40 hover:text-white text-xs font-mono ml-2 uppercase font-black tracking-widest pl-2 border-l border-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#1DB954]/2 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded bg-white/5 border border-white/10 text-[#1DB954]">
          <Plus className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-display text-xs font-black tracking-widest text-[#1DB954] uppercase">Submit Song for Curation</h4>
          <p className="text-[10px] font-mono text-white/40 mt-0.5">CONTRIBUTE TO BASS HYPNOSIS 2026</p>
        </div>
      </div>

      {isSuccess ? (
        <div id="submission-success-container" className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded bg-[#1DB954]/10 border border-[#1DB954]/20 text-[#1DB954] flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h5 className="font-display text-sm font-black tracking-wider text-white">SUBMISSION ENQUEUED</h5>
            <p className="text-xs text-white/60 leading-relaxed max-w-sm mx-auto">
              Your song has been uploaded to the curation queue. Our lead editor will review the track and use our <span className="text-[#1DB954] font-semibold">Gemini AI Engine</span> to draft an optimized SEO landing profile!
            </p>
          </div>
          <button
            onClick={() => setIsSuccess(false)}
            className="px-5 py-2.5 rounded bg-white/10 hover:bg-white/15 text-white font-mono font-bold text-xs transition-all tracking-wider uppercase"
          >
            SUBMIT ANOTHER TRACK
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div id="submission-error-alert" className="p-3 rounded bg-red-950/20 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase tracking-widest font-black text-white/50">Track Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Adhana"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full text-xs font-sans rounded bg-[#050505] border border-white/10 focus:border-[#1DB954] focus:outline-none p-2.5 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase tracking-widest font-black text-white/50">Artist / Project <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Astrix & Vini Vici"
                value={formData.artist}
                onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                required
                className="w-full text-xs font-sans rounded bg-[#050505] border border-white/10 focus:border-[#1DB954] focus:outline-none p-2.5 text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase tracking-widest font-black text-white/50">Spotify Song URL <span className="text-red-500">*</span></label>
            <input
              type="url"
              placeholder="e.g. https://open.spotify.com/track/..."
              value={formData.spotifyUrl}
              onChange={(e) => setFormData({ ...formData, spotifyUrl: e.target.value })}
              required
              className="w-full text-xs font-mono rounded bg-[#050505] border border-white/10 focus:border-[#1DB954] focus:outline-none p-2.5 text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase tracking-widest font-black text-white/50">Psytrance Subgenre</label>
              <select
                value={formData.subgenre}
                onChange={(e) => setFormData({ ...formData, subgenre: e.target.value })}
                className="w-full text-xs font-mono font-bold rounded bg-[#050505] border border-white/10 focus:border-[#1DB954] focus:outline-none p-2.5 text-white cursor-pointer"
              >
                <option value="Progressive Psytrance">Progressive Psytrance</option>
                <option value="Psychedelic Trance">Classic Psytrance</option>
                <option value="Full-On Psytrance">Full-On Psytrance</option>
                <option value="Progressive Trance">Melodic Progressive Trance</option>
                <option value="Forest / Twilight">Forest & Twilight Psy</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase tracking-widest font-black text-white/50">Your Name / Alias</label>
              <input
                type="text"
                placeholder="e.g. PsyCurator"
                value={formData.submitterName}
                onChange={(e) => setFormData({ ...formData, submitterName: e.target.value })}
                className="w-full text-xs font-sans rounded bg-[#050505] border border-white/10 focus:border-[#1DB954] focus:outline-none p-2.5 text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="block text-[10px] font-mono uppercase tracking-widest font-black text-white/50">Vibe Resonance Notes</label>
              <span className="text-[9px] font-mono text-white/40 font-bold uppercase tracking-wider">How does this song fit Bass Hypnosis?</span>
            </div>
            <textarea
              placeholder="Explain the synthesizers, kicks, sub-bass progression, and general kinetic power of this song..."
              rows={3}
              value={formData.vibeText}
              onChange={(e) => setFormData({ ...formData, vibeText: e.target.value })}
              className="w-full text-xs font-sans rounded bg-[#050505] border border-white/10 focus:border-[#1DB954] focus:outline-none p-2.5 text-white resize-none"
            />
          </div>

          <div className="pt-1 select-none text-[10px] text-white/50 flex items-start gap-1.5 leading-relaxed font-mono">
            <HelpCircle className="w-3.5 h-3.5 mt-0.5 text-[#1DB954] shrink-0" />
            <span>By submitting, you consent to our curation team evaluating and releasing this track dynamically. Real-time updates push automatically to our front page on approval.</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded text-xs font-black font-mono tracking-wider transition-all duration-300 uppercase ${
              isLoading
                ? "bg-white/5 text-white/40 cursor-not-allowed border border-white/10"
                : "bg-[#1DB954] hover:bg-[#1ed760] text-black active:scale-98"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isLoading ? "UPLOADING TO REGISTRY..." : "TRANSMIT SUBMISSION"}</span>
          </button>
        </form>
      )}
    </div>
  );
}
