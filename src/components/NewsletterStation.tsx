import React, { useState, useEffect } from "react";
import { Mail, Send, CheckCircle2, AlertCircle, Sparkles, Radio, User, Bell, RefreshCw } from "lucide-react";
import { Subscriber, EmailDispatchLog } from "../types";

export default function NewsletterStation({ isCompact = false }: { isCompact?: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseMsg, setResponseMsg] = useState<{ text: string; success: boolean } | null>(null);
  
  // Subscriber Session State (User logged in as newsletter subscriber)
  const [loggedInSubscriber, setLoggedInSubscriber] = useState<Subscriber | null>(() => {
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

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<EmailDispatchLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchData = async () => {
    setIsLoadingLogs(true);
    try {
      const [subsRes, logsRes] = await Promise.all([
        fetch("/api/newsletter/subscribers"),
        fetch("/api/newsletter/logs")
      ]);

      if (subsRes.ok && logsRes.ok) {
        setSubscribers(await subsRes.json());
        setDispatchLogs(await logsRes.json());
      }
    } catch (e) {
      console.error("Failed to load newsletter states", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll logs every 10 seconds to show simulated real-time email delivery events when tracks are approved in other tabs
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Listen for login/logout synchronization events from other instances
  useEffect(() => {
    const handleAuthChange = () => {
      const saved = localStorage.getItem("newsletter_subscriber");
      if (saved) {
        try {
          setLoggedInSubscriber(JSON.parse(saved));
        } catch (e) {
          setLoggedInSubscriber(null);
        }
      } else {
        setLoggedInSubscriber(null);
      }
      fetchData(); // sync data
    };

    window.addEventListener("newsletter-auth-changed", handleAuthChange);
    return () => window.removeEventListener("newsletter-auth-changed", handleAuthChange);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setResponseMsg(null);

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || "Underground Listener" })
      });

      const data = await res.json();
      if (res.ok) {
        setResponseMsg({ text: data.message, success: true });
        setLoggedInSubscriber(data.subscriber);
        localStorage.setItem("newsletter_subscriber", JSON.stringify(data.subscriber));
        
        // Reset inputs
        setEmail("");
        setName("");
        
        // Notify other components to refresh immediately
        window.dispatchEvent(new Event("newsletter-auth-changed"));
      } else {
        setResponseMsg({ text: data.error || "Failed to subscribe.", success: false });
      }
    } catch (e) {
      setResponseMsg({ text: "Network issue joining transmitter pool.", success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("newsletter_subscriber");
    setLoggedInSubscriber(null);
    setResponseMsg(null);
    window.dispatchEvent(new Event("newsletter-auth-changed"));
  };

  if (isCompact) {
    return (
      <div 
        id="newsletter-station-container-compact" 
        className="p-4 rounded bg-[#070707] border border-[#1DB954]/20 hover:border-[#1DB954]/45 transition-all relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#1DB954]/5 rounded-full blur-lg pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Info */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-white/5 border border-white/10 text-[#1DB954] shrink-0">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black tracking-widest text-[#1DB954] uppercase">Live Newsletter Link</span>
                <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-white/50">{subscribers.length} connected</span>
              </div>
              <p className="text-xs text-white/80 font-sans mt-0.5 font-medium">Get notified automatically the exact second a curator drops a new track!</p>
            </div>
          </div>

          {/* Action / Subscriber state */}
          <div className="w-full lg:w-auto shrink-0">
            {loggedInSubscriber ? (
              <div className="flex items-center gap-4 bg-white/5 border border-[#1DB954]/25 px-3 py-1.5 rounded text-xs select-none">
                <div className="min-w-0">
                  <span className="block text-[10px] text-white/50 font-mono leading-none">linked:</span>
                  <span className="block text-white font-mono font-bold truncate mt-1">{loggedInSubscriber.name} ({loggedInSubscriber.email})</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-[9px] font-mono font-black text-red-400 hover:text-red-300 uppercase tracking-widest border border-red-500/20 px-2 py-1 rounded shrink-0 bg-red-500/5 hover:bg-red-500/10 transition-all"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs font-sans rounded bg-black border border-white/10 pl-3 pr-3 py-2 text-white placeholder-white/25 focus:outline-none focus:border-[#1DB954] transition-all min-w-[120px]"
                />
                
                <div className="flex items-center gap-1.5 w-full sm:w-auto min-w-[200px]">
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs font-mono rounded bg-black border border-white/10 pl-3 pr-2 py-2 text-white placeholder-white/25 focus:outline-none focus:border-[#1DB954] transition-all"
                  />
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    title="Subscribe"
                    className="px-3.5 py-2 rounded bg-[#1DB954] hover:bg-[#1ed760] text-black font-mono text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 inline-flex items-center justify-center shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 text-black font-black" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Floating status alert output inside container */}
        {responseMsg && (
          <div 
            className={`mt-2.5 p-1.5 rounded text-[10px] font-mono flex items-center justify-between gap-2 border ${
              responseMsg.success 
                ? "bg-[#1DB954]/5 border-[#1DB954]/20 text-[#1DB954]" 
                : "bg-red-950/20 border-red-500/20 text-red-300"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {responseMsg.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span>{responseMsg.text}</span>
            </span>
            <button onClick={() => setResponseMsg(null)} className="text-[10px] px-1 text-white/40 hover:text-white font-black">✕</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="newsletter-station-container" className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 rounded bg-[#0a0a0a] border border-white/10 relative overflow-hidden">
      {/* Visual background waves ambient indicators */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#1DB954]/5 rounded-full blur-xl pointer-events-none" />

      {/* Left Column: Form / Subscription Action (Span 5) */}
      <div className="md:col-span-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-white/5 border border-white/10 text-[#1DB954]">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="font-display text-xs font-black tracking-widest text-[#1DB954] uppercase">Automated News Loop Service</h4>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-0.5">Automated release dispatch & curator alerts</p>
          </div>
        </div>

        <p className="text-xs text-white/60 leading-relaxed font-sans font-medium">
          Connect your email below to receive real-time drop notifications. <span className="text-[#1DB954] font-bold font-mono">CRITICAL:</span> Only email newsletter-connected users are permitted to upvote tracks. <span className="text-yellow-500 font-bold font-mono">Your Full Name acts as your secure vote password!</span>
        </p>

        {loggedInSubscriber ? (
          <div id="newsletter-logged-in-profile" className="p-4 rounded bg-white/5 border border-[#1DB954]/25 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono tracking-widest text-[#1DB954] font-black uppercase">Subscriber Transmitted Loop ACTIVE</span>
              <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-ping" />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/20 flex items-center justify-center text-sm font-mono shrink-0">
                👤
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white uppercase truncate">{loggedInSubscriber.name}</span>
                <span className="block text-[10px] text-white/50 font-mono truncate">{loggedInSubscriber.email}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-[9px] font-mono text-white/30 lowercase italic">enrolledAt: {new Date(loggedInSubscriber.enrolledAt).toLocaleDateString()}</span>
              <button
                onClick={handleLogout}
                className="text-[9px] font-mono font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest border border-red-500/10 hover:border-red-500/25 px-2 py-0.5 rounded"
              >
                Disconnect Loop
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-3">
            {responseMsg && (
              <div 
                className={`p-2.5 rounded text-[10px] flex items-center gap-2 border ${
                  responseMsg.success 
                    ? "bg-[#1DB954]/5 border-[#1DB954]/20 text-[#1DB954]" 
                    : "bg-red-950/20 border-red-500/20 text-red-300"
                }`}
              >
                {responseMsg.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{responseMsg.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase tracking-widest text-white/50">Full Name (Secure Vote Password)</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/30" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Astral Curation DJ"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs font-sans rounded bg-[#050505] border border-white/10 pl-8 pr-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-[#1DB954] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-mono uppercase tracking-widest text-white/50">Your Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/30" />
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs font-mono rounded bg-[#050505] border border-white/10 pl-8 pr-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-[#1DB954] transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1DB954]/10 to-[#1DB954]/20 hover:from-[#1DB954]/20 hover:to-[#1DB954]/30 border border-[#1DB954]/35 text-white font-mono text-xs font-black tracking-widest uppercase transition-all duration-300 rounded"
            >
              <Send className="w-3 h-3 text-[#1DB954]" />
              <span>{isSubmitting ? "BINDING ENROLLMENT..." : "SUBSCRIBE / LOGIN AS NEWSLETTER"}</span>
            </button>
          </form>
        )}

        {/* List of active subscribers */}
        <div className="pt-2">
          <span className="block text-[9px] font-mono uppercase tracking-widest text-white/40 block mb-1">Active Loop Transmitter Registry ({subscribers.length}):</span>
          <div className="flex flex-wrap gap-1 max-h-[70px] overflow-y-auto pr-1">
            {subscribers.map((subs) => {
              const isActiveUser = loggedInSubscriber?.email.toLowerCase() === subs.email.toLowerCase();
              return (
                <span 
                  key={subs.id} 
                  className={`inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded border ${
                    isActiveUser 
                      ? "bg-[#1DB954]/10 border-[#1DB954] text-[#1DB954] font-black"
                      : "bg-white/5 border-white/10 text-white/60"
                  }`}
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  <span>{subs.name}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Simulated Live Automated Mail Logs (Span 7) */}
      <div className="md:col-span-6 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-5 flex flex-col h-full min-h-[220px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-emerald-400" />
            <h4 className="font-display text-xs font-black tracking-widest text-white uppercase sm:inline">Portal automated dispatch logs</h4>
          </div>
          <button
            onClick={fetchData}
            title="Reload Delivery Records"
            className="p-1 rounded bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all disabled:opacity-40"
            disabled={isLoadingLogs}
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex-1 bg-black/40 border border-white/5 rounded p-3 overflow-y-auto max-h-[200px] text-[10px] space-y-2 font-mono scrollbar-thin">
          <div className="flex justify-between items-center text-[8px] font-mono tracking-wider text-white/40 border-b border-white/10 pb-1 mb-2">
            <span>RECIPIENT & SUBJECT SIGNATURE</span>
            <span>STATUS</span>
          </div>

          {dispatchLogs.length === 0 ? (
            <div className="py-8 text-center text-white/30 italic">
              <p>No automatic newsletters dispatched yet.</p>
              <p className="text-[8px] mt-1 text-[#1DB954] uppercase font-bold tracking-widest">Enroll your mail & approve community sub to test email trigger!</p>
            </div>
          ) : (
            dispatchLogs.map((log) => (
              <div key={log.id} className="p-2 rounded bg-black/35 border border-white/5 space-y-1 relative hover:border-[#1DB954]/20 transition-all">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-sans min-w-0">
                    <span className="block font-bold text-white/80 lowercase truncate">{log.recipientName} ({log.recipientEmail})</span>
                    <span className="block text-[9px] font-mono text-[#1DB954] truncate mt-0.5">{log.subject}</span>
                  </div>
                  <span className="shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold px-1.5 py-0.2 rounded uppercase">
                    {log.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[7.5px] text-white/30 pt-1 border-t border-white/5">
                  <span>Track: {log.trackTitle} ({log.trackArtist})</span>
                  <span>{new Date(log.sentAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
