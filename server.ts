import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { fullPlaylistTracks } from "./src/playlistTracks";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header per guidelines
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Initial state data structures
interface Song {
  id: string;
  slug?: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  vibe: string;
  subgenre: string;
  energyScore: number; // 1-10 scale
  spotifyUrl: string;
  reviewQuote: string;
  seoDescription: string;
  focusKeywords: string[];
  upvotes: number;
  isCustomSubmission?: boolean;
  artistBio?: string;
  aboutTrack?: string;
  trackLinks?: string;
  durationMs?: number;
  previewUrl?: string | null;
}

interface Submission {
  id: string;
  title: string;
  artist: string;
  spotifyUrl: string;
  subgenre: string;
  vibeText: string;
  submitterName: string;
  submitterEmail: string;
  status: "pending" | "approved" | "declined";
  createdAt: string;
  aiSuggestedBpm?: number;
  aiSuggestedKey?: string;
  aiSeoDraft?: string;
}

// Helper to generate a deterministic number/vibe from track strings so they remain consistent
const getDeterministicValue = (str: string, options: any[]): any => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % options.length;
  return options[index];
};

// Map Spotify or list tracks to high-fidelity Curation Info
function slugify(text: string): string {
  return text
    .toString()
    .replace(/অপূর্ব/g, "apurbo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "track";
}

function generateTrackSlug(artist: string, title: string, id?: string): string {
  const base = `${slugify(artist)}-${slugify(title)}`.replace(/-+/g, "-");
  if (title.toLowerCase().includes("sertraline") && id) {
    const shortId = id.slice(-6).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (shortId && shortId !== "m5vz") {
      return `${base}-${shortId}`.replace(/-+/g, "-");
    }
  }
  return base;
}

function makeHighFidelitySong(
  title: string,
  artist: string,
  spotifyUrl: string,
  previewUrl?: string | null,
  durationMs?: number,
  exactBpm?: number,
  exactKey?: string,
  exactSubgenre?: string,
  exactEnergyScore?: number,
  exactVibe?: string,
  idPrefix = "track-spotify"
): Song {
  const cleanId = (title + artist).replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  
  // Find authentic track data from fullPlaylistTracks if available
  const trackId = spotifyUrl.split("/").pop()?.split("?")[0] || "";
  const existing = fullPlaylistTracks.find(t => 
    t.id === trackId || 
    (t.title.toLowerCase().trim() === title.toLowerCase().trim() && t.artist.toLowerCase().trim() === artist.toLowerCase().trim())
  );

  const slug = generateTrackSlug(artist, title, existing?.id || trackId);
  const bpm = exactBpm ?? existing?.bpm ?? 122;
  const key = exactKey ?? existing?.key ?? "D Minor";
  const subgenre = exactSubgenre ?? existing?.subgenre ?? "Progressive House";
  const energyScore = exactEnergyScore ?? existing?.energyScore ?? 8;
  const vibe = exactVibe ?? existing?.vibe ?? `Hypnotic ${subgenre} groove with ${bpm} BPM tempo in ${key}`;
  const upvotes = 0; // Live upvotes start at 0 for publication; upvoted by verified subscribers
  
  const focusKeywords = [
    `${artist} ${title}`,
    `${subgenre} 2026`,
    `Bass Hypnosis ${bpm}BPM`,
    `${key} Progressive`
  ];
  
  const reviewQuote = `A classic piece of progressive underground production. ${artist} displays immense technical mastery in this release, building layered bass frequencies and ethereal synth work over a rhythmic ${bpm} BPM foundation.`;
  const seoDescription = `An in-depth curator analysis of ${title} by ${artist}. Experience standard-setting electronic production details like its ${key} harmonic signature, driving ${subgenre} sub-bass dynamics, and hypnotic structural transitions customized for the Bass Hypnosis collection.`;
  
  const artistBio = `${artist} is a dedicated innovator in deep progressive and underground melodic music. Across catalog releases and international DJ support, they have developed a signature sonic architecture defined by rolling basslines, spatial reverbs, and analog synth progressions.`;
  const aboutTrack = `"${title}" delivers exceptional sonic depth with its ${key} tonal progression. Featuring pristine low-end control, driving rhythmic grooves, and nuanced sound design, it operates at a refined tempo of ${bpm} BPM.`;
  const trackLinks = `Spotify Stream: ${spotifyUrl}\nBeatport Search: https://www.beatport.com/search?q=${encodeURIComponent(artist + " " + title)}\nSoundcloud Links: https://soundcloud.com/search?q=${encodeURIComponent(artist + " " + title)}`;

  return {
    id: `${idPrefix}-${cleanId}`,
    slug,
    title,
    artist,
    bpm,
    key,
    vibe,
    subgenre,
    energyScore,
    spotifyUrl,
    reviewQuote,
    seoDescription,
    focusKeywords,
    upvotes,
    artistBio,
    aboutTrack,
    trackLinks,
    previewUrl: previewUrl || existing?.previewUrl || null,
    durationMs: durationMs || existing?.durationMs || undefined
  };
}

// In-Memory state initialized directly with all 100 tracks from the official Spotify playlist
const tracksData: Song[] = fullPlaylistTracks.map(p => {
  const url = `https://open.spotify.com/track/${p.id}`;
  return makeHighFidelitySong(
    p.title,
    p.artist,
    url,
    p.previewUrl,
    p.durationMs,
    p.bpm,
    p.key,
    p.subgenre,
    p.energyScore,
    p.vibe
  );
});

// Newsletter & Automated Simulation System State
interface Subscriber {
  id: string;
  email: string;
  name: string;
  enrolledAt: string;
}

interface EmailDispatchLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  trackTitle: string;
  trackArtist: string;
  sentAt: string;
  status: "delivered";
}

const subscribersData: Subscriber[] = [];

const emailDispatchLogs: EmailDispatchLog[] = [];

// Automated Mail Broadcast function
function broadcastNewsletter(song: { title: string; artist: string }) {
  console.log(`[Newsletter] Sending automated dispatch alerts to ${subscribersData.length} subscribers for track: ${song.title}`);
  subscribersData.forEach(sub => {
    emailDispatchLogs.unshift({
      id: "dispatch-" + Math.floor(Math.random() * 900000 + 100000),
      recipientEmail: sub.email,
      recipientName: sub.name,
      subject: `⚡ [BASS HYPNOSIS 2026] New Peak Added: ${song.title.toUpperCase()} by ${song.artist.toUpperCase()}`,
      trackTitle: song.title,
      trackArtist: song.artist,
      sentAt: new Date().toISOString(),
      status: "delivered"
    });
  });
}

// Live Spotify playlist sync state
let nextSyncTime = 0;
async function syncSpotifyTracks() {
  const playlistId = "2sCu2R0XnUTw9na0ofT4vb";
  // Sync at most once per 5 minutes if we already have the full track list
  if (Date.now() < nextSyncTime && tracksData.length >= 100) {
    return;
  }
  
  console.log(`[Spotify Sync] Fetching tracklist for playlist ${playlistId}...`);
  try {
    const response = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (response.ok) {
      const html = await response.text();
      let spotifyItems: any[] = [];

      // Method A: Check for script id="__NEXT_DATA__" JSON (standard current Spotify embed structure)
      const nextMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/i);
      if (nextMatch && nextMatch[1]) {
        try {
          const parsed = JSON.parse(nextMatch[1]);
          const nextTracks = parsed?.props?.pageProps?.state?.data?.entity?.trackList ||
                             parsed?.props?.pageProps?.state?.data?.tracks?.items ||
                             parsed?.props?.pageProps?.state?.data?.entity?.tracks?.items;
          if (nextTracks && Array.isArray(nextTracks)) {
            spotifyItems = nextTracks;
            console.log(`[Spotify Sync] Parsed ${spotifyItems.length} tracks from __NEXT_DATA__`);
          }
        } catch (e) {
          console.error("Failed to parse __NEXT_DATA__ JSON", e);
        }
      }

      // Method B: Check for script id="resource" JSON
      if (spotifyItems.length === 0) {
        const resourceMatch = html.match(/<script\s+id="resource"\s+type="application\/json">([\s\S]*?)<\/script>/i);
        if (resourceMatch && resourceMatch[1]) {
          try {
            const parsed = JSON.parse(resourceMatch[1]);
            if (parsed?.tracks?.items) {
              spotifyItems = parsed.tracks.items;
              console.log(`[Spotify Sync] Parsed ${spotifyItems.length} tracks from id="resource"`);
            } else if (parsed?.trackList) {
              spotifyItems = parsed.trackList;
            }
          } catch (e) {
            console.error("Failed to parse resource JSON from Spotify", e);
          }
        }
      }

      // Method C: Check for script id="initial-state" JSON
      if (spotifyItems.length === 0) {
        const stateMatch = html.match(/<script\s+id="initial-state"\s+type="application\/json">([\s\S]*?)<\/script>/i);
        if (stateMatch && stateMatch[1]) {
          try {
            const parsed = JSON.parse(stateMatch[1]);
            if (parsed?.tracks?.items) {
              spotifyItems = parsed.tracks.items;
              console.log(`[Spotify Sync] Parsed ${spotifyItems.length} tracks from id="initial-state"`);
            } else if (parsed?.entities?.items) {
              spotifyItems = parsed.entities.items;
            } else if (parsed?.entity?.trackList) {
              spotifyItems = parsed.entity.trackList;
            }
          } catch (e) {
            console.error("Failed to parse initial-state JSON", e);
          }
        }
      }

      if (spotifyItems && spotifyItems.length > 0) {
        // Clear non-custom tracks to refresh with the real parsed tracks
        const customTracks = tracksData.filter(t => t.isCustomSubmission);
        const newTracksList: Song[] = [];
        
        spotifyItems.forEach((item: any) => {
          const track = item.track || item;
          if (track) {
            // Check Spotify embed trackList structure
            const title = track.title || track.name;
            const artist = track.subtitle || (Array.isArray(track.artists)
              ? track.artists.map((a: any) => a.name || a.profile?.name || "").filter(Boolean).join(" & ")
              : track.artists);
            
            if (title && artist) {
              const trackId = track.uri ? track.uri.replace("spotify:track:", "") : (track.id || Math.random().toString());
              const url = `https://open.spotify.com/track/${trackId}`;
              const previewUrl = track.audioPreview?.url || null;
              const durationMs = track.duration;
              
              // Build high-fidelity song
              const newSong = makeHighFidelitySong(title, artist, url, previewUrl, durationMs);
              newTracksList.push(newSong);
            }
          }
        });

        if (newTracksList.length > 0) {
          // Replace current tracks with newly synced ones + existing custom tracks
          tracksData.length = 0;
          tracksData.push(...newTracksList, ...customTracks);
          nextSyncTime = Date.now() + 300000; // cache for 5 minutes
          console.log(`[Spotify Sync] Successfully synced ${newTracksList.length} live tracks from playlist.`);
          return;
        }
      }
    }
  } catch (err) {
    console.error("[Spotify Sync] Error crawling Spotify embed:", err);
  }

  // Fallback / Initial Seed: Merge with full 100 pre-extracted playlist songs
  if (tracksData.length === 0) {
    console.log(`[Spotify Sync] Seeding ${fullPlaylistTracks.length} high-fidelity songs from full playlist catalog...`);
    const customTracks = tracksData.filter(t => t.isCustomSubmission);
    const fallbackList: Song[] = fullPlaylistTracks.map(p => {
      const url = `https://open.spotify.com/track/${p.id}`;
      return makeHighFidelitySong(
        p.title,
        p.artist,
        url,
        p.previewUrl,
        p.durationMs,
        p.bpm,
        p.key,
        p.subgenre,
        p.energyScore,
        p.vibe
      );
    });

    // Re-build tracksData
    tracksData.length = 0;
    tracksData.push(...fallbackList, ...customTracks);
    nextSyncTime = Date.now() + 300000;
  }
}
const submissionsData: Submission[] = [];

// --- REST API ENDPOINTS ---

// Get all active tracks configured for the website
app.get("/api/tracks", async (req, res) => {
  try {
    await syncSpotifyTracks();
  } catch (e) {
    console.error("Failed to sync on GET /api/tracks", e);
  }
  res.json(tracksData);
});

// Static JSON Sitemap endpoint for SEO discovery & web indexers
app.get("/sitemap.json", (req, res) => {
  const sitemapPath = path.join(process.cwd(), "public", "sitemap.json");
  if (fs.existsSync(sitemapPath)) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.sendFile(sitemapPath);
  }
  res.status(404).json({ error: "Sitemap file not found" });
});

// API alias for sitemap
app.get("/api/sitemap", (req, res) => {
  const sitemapPath = path.join(process.cwd(), "public", "sitemap.json");
  if (fs.existsSync(sitemapPath)) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.sendFile(sitemapPath);
  }
  res.status(404).json({ error: "Sitemap file not found" });
});

// Static robots.txt endpoint
app.get("/robots.txt", (req, res) => {
  const robotsPath = path.join(process.cwd(), "public", "robots.txt");
  if (fs.existsSync(robotsPath)) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.sendFile(robotsPath);
  }
  res.send("User-agent: *\nAllow: /\n\nSitemap: /sitemap.json\n");
});

// Force refresh sync of the Spotify playlist tracks
app.post("/api/tracks/sync", async (req, res) => {
  try {
    nextSyncTime = 0; // bypass cache lock
    await syncSpotifyTracks();
    res.json({ success: true, count: tracksData.length });
  } catch (e: any) {
    console.error("Manual sync error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Upvote a track - gated for newsletter connected subscribers ONLY (full name acts as password)
app.post("/api/tracks/:id/upvote", (req, res) => {
  const { id } = req.params;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(401).json({ 
      error: "Only connected newsletter subscribers can vote. Please enter your email and full name to authorize." 
    });
  }

  const subscriber = subscribersData.find(s => s.email.toLowerCase() === email.toLowerCase());
  if (!subscriber) {
    return res.status(403).json({ 
      error: "This email is not subscribed to the newsletter. Please subscribe below first!" 
    });
  }

  // Take the subscriber's full name as password
  if (subscriber.name.trim().toLowerCase() !== password.trim().toLowerCase()) {
    return res.status(403).json({ 
      error: "Invalid credentials. The full name you entered does not match our newsletter records for this email." 
    });
  }

  const track = tracksData.find(t => t.id === id);
  if (track) {
    track.upvotes += 1;
    res.json({ success: true, upvotes: track.upvotes });
  } else {
    res.status(404).json({ error: "Track not found" });
  }
});

// Get submissions (for Admin panel)
app.get("/api/submissions", (req, res) => {
  res.json(submissionsData);
});

// Users submit new track
app.post("/api/submissions", (req, res) => {
  const { title, artist, spotifyUrl, subgenre, vibeText, submitterName, submitterEmail } = req.body;
  
  if (!title || !artist || !spotifyUrl) {
    return res.status(400).json({ error: "Title, Artist, and Spotify Link are required." });
  }

  const newSub: Submission = {
    id: "sub-" + Date.now(),
    title,
    artist,
    spotifyUrl,
    subgenre: subgenre || "Psychedelic Trance",
    vibeText: vibeText || "Vibe description not provided.",
    submitterName: submitterName || "Anonymous Curate",
    submitterEmail: submitterEmail || "no-email@provided.com",
    status: "pending",
    createdAt: new Date().toISOString()
  };

  submissionsData.push(newSub);
  res.status(201).json({ success: true, submission: newSub });
});

// Approve a submission
app.put("/api/submissions/:id/approve", (req, res) => {
  const { id } = req.params;
  const { bpm, key, seoDescription, reviewQuote, energyScore, focusKeywords } = req.body;
  
  const subIndex = submissionsData.findIndex(s => s.id === id);
  if (subIndex === -1) {
    return res.status(404).json({ error: "Submission not found" });
  }

  const submission = submissionsData[subIndex];
  submission.status = "approved";

  // Check if already transformed to track
  const trackId = `track-${submission.id}`;
  const existingTrack = tracksData.find(t => t.id === trackId);

  if (!existingTrack) {
    const finalBpm = Number(bpm) || submission.aiSuggestedBpm || 135;
    const finalKey = key || submission.aiSuggestedKey || "G Minor";
    const finalSeo = seoDescription || submission.aiSeoDraft || `Discover ${submission.title} by ${submission.artist}. A premium community selection featured on Bass Hypnosis.`;
    const keywordsList = Array.isArray(focusKeywords) 
      ? focusKeywords 
      : typeof focusKeywords === "string" 
        ? (focusKeywords as string).split(",").map(k => k.trim())
        : [submission.artist, submission.title, "Bass Hypnosis Curated"];

    const newSong: Song = {
      id: trackId,
      title: submission.title,
      artist: submission.artist,
      bpm: finalBpm,
      key: finalKey,
      vibe: submission.vibeText,
      subgenre: submission.subgenre,
      energyScore: Number(energyScore) || 7,
      spotifyUrl: submission.spotifyUrl,
      reviewQuote: reviewQuote || `Curator's Voice: Beautifully recommended by community advocate ${submission.submitterName}! Earning high physical resonance across Progressive Trance lovers.`,
      seoDescription: finalSeo,
      focusKeywords: keywordsList,
      upvotes: Math.floor(Math.random() * 15) + 5,
      isCustomSubmission: true
    };

    tracksData.push(newSong);
    
    // Auto broadcast automated newsletter emails to all registered listeners
    try {
      broadcastNewsletter(newSong);
    } catch (e) {
      console.error("Failed to broadcast newsletter", e);
    }
  }

  res.json({ success: true, submission, tracks: tracksData });
});

// --- REST API NEWSLETTER ENDPOINTS ---

// Get subscribers list
app.get("/api/newsletter/subscribers", (req, res) => {
  res.json(subscribersData);
});

// Register or log in a newsletter subscriber
app.post("/api/newsletter/subscribe", (req, res) => {
  const { email, name } = req.body;
  
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Please enter a valid email address to join." });
  }

  const existing = subscribersData.find(s => s.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.json({
      success: true,
      alreadyEnrolled: true,
      subscriber: existing,
      message: `${email} is already active on our transmitter list.`
    });
  }

  const newSub: Subscriber = {
    id: "sub-" + Date.now(),
    email,
    name: name || "Underground Listener",
    enrolledAt: new Date().toISOString()
  };

  subscribersData.push(newSub);

  // Send virtual welcome newsletter mail log
  emailDispatchLogs.unshift({
    id: "dispatch-welcome-" + Math.floor(Math.random() * 900000 + 100000),
    recipientEmail: newSub.email,
    recipientName: newSub.name,
    subject: `👋 WELCOME TO BASS HYPNOSIS: Transmissions Online!`,
    trackTitle: "Transmission Connection",
    trackArtist: "PlayLSD Curation Head",
    sentAt: new Date().toISOString(),
    status: "delivered"
  });

  res.status(201).json({
    success: true,
    alreadyEnrolled: false,
    subscriber: newSub,
    message: `Transmission link established! Welcome to the loop, ${newSub.name || "Listener"}.`
  });
});

// Get subscribers dispatch web delivery logs
app.get("/api/newsletter/logs", (req, res) => {
  res.json(emailDispatchLogs);
});

// Decline a submission
app.put("/api/submissions/:id/decline", (req, res) => {
  const { id } = req.params;
  const sub = submissionsData.find(s => s.id === id);
  if (!sub) {
    return res.status(404).json({ error: "Submission not found" });
  }
  sub.status = "declined";
  res.json({ success: true, submission: sub });
});

// Admin Analytics aggregation
app.get("/api/analytics", (req, res) => {
  const totalSubmissions = submissionsData.length;
  const pendingCount = submissionsData.filter(s => s.status === "pending").length;
  const approvedCount = submissionsData.filter(s => s.status === "approved").length;
  const declinedCount = submissionsData.filter(s => s.status === "declined").length;
  
  // Genres distribution in active list
  const genreDistribution: { [key: string]: number } = {};
  tracksData.forEach(t => {
    genreDistribution[t.subgenre] = (genreDistribution[t.subgenre] || 0) + 1;
  });

  // Upvote tally
  const totalVotesOnSite = tracksData.reduce((acc, t) => acc + t.upvotes, 0);

  // Energy distribution
  const avgEnergy = Number((tracksData.reduce((acc, t) => acc + t.energyScore, 0) / tracksData.length).toFixed(1));

  res.json({
    totalSubmissions,
    pendingCount,
    approvedCount,
    declinedCount,
    totalActiveSongs: tracksData.length,
    genreDistribution,
    totalVotesOnSite,
    avgEnergy,
    customSubmissionsCount: tracksData.filter(t => t.isCustomSubmission).length
  });
});

// Dynamic AI Song SEO Optimizer using Gemini
app.post("/api/gemini/curate", async (req, res) => {
  if (!ai) {
    // Elegant system fallback if API key is not active
    return res.json({
      fallback: true,
      bpm: 138,
      key: "F# Minor",
      vibeProfile: "Fast energetic offbeats, high tech spatial synth evolution, tribal atmosphere",
      seoBrief: `Discovering ${req.body.title} by ${req.body.artist}. A peak psychedelic progressive cut blending hypnotic acoustic loops and cybernetic synthesizer grids curated for Bass Hypnosis 2026.`,
      focusKeywords: [req.body.artist, req.body.title, "Psytrance Progressive", "Bass Hypnosis 2026", "Sub Bass Anthem"],
      reviewerQuote: `A thrilling display of acoustic energy. Highly recommended additions highlighting heavy low-frequency oscillations.`
    });
  }

  const { title, artist, vibeText } = req.body;
  if (!title || !artist) {
    return res.status(400).json({ error: "Title and Artist are required for Gemini AI curation." });
  }

  const prompt = `You are the lead editor and electronic music branding expert for "Bass Hypnosis", a premium Spotify playlist focused on high-quality Psychedelic Trance, Progressive Psy-Trance, and heavy underground synth/progressive tracks.
  
  Analyze the following song and construct a detailed curation & SEO summary.
  Song: "${title}" by "${artist}". 
  Submitter note: "${vibeText || ""}"
  
  Return a raw JSON format output complying exactly with the following typescript structure (Do not add markdown accents like \`\`\`json, just output clean JSON string):
  {
    "bpm": 138,
    "key": "G# Minor",
    "vibeProfile": "Brief atmospheric mood descriptions (max 15 words)",
    "seoBrief": "A highly descriptive, keyword-optimized paragraph (80-120 words) detailing the track's spatial synthesis, bpm dynamics, sub-bass composition, and why it ranks as an essential progressive psytrance anthem for modern visual dashboards. This description is optimized for search engines.",
    "focusKeywords": ["focused search query 1", "focused search query 2", "focused search query 3", "focused search query 4"],
    "reviewerQuote": "A stylized, creative 2-sentence reviewer's critique or 'Curator Commentary' praising the track's high physical resonance, kick drums, or cybernetic synths."
  }
  
  Perform accurate industry estimation of typical Progressive or Psytrance attributes for the BPM (usually 134 to 142) and musical keys. Make the tone dark, elite, sophisticated, and deeply descriptive.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    // Strip markdown wrappers if any were returned in spite of responseMimeType
    let cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleanedText);
    res.json(data);
  } catch (error: any) {
    console.error("Gemini optimization error:", error);
    // Graceful error recovery returning high-fidelity fallback
    res.json({
      fallback: true,
      error: error.message,
      bpm: 138,
      key: "G# Minor",
      vibeProfile: "Hypnotic rolling bass, twilight synth synthesis, heavy kicks",
      seoBrief: `Unveiling '${title}' by ${artist}. An absolute essential addition to the progressive psychedelic playlist community. This track represents the ultimate synthesis of physical sub-bass mastery and late-night hypnotic energy, driving deep organic audio aesthetics.`,
      focusKeywords: [artist, title, "Psychedelic Trance", "Bass Hypnosis Review"],
      reviewerQuote: `An outstanding example of underground sound engineering. The acoustic resonance and razor-sharp percussive loops keep listeners locked in dynamic states of bass hypnosis.`
    });
  }
});

// Admin endpoint to GET all active tracks directly
app.get("/api/admin/tracks", (req, res) => {
  res.json(tracksData);
});

// Admin endpoint to EDIT an active track's metadata
app.put("/api/admin/tracks/:id", (req, res) => {
  const { id } = req.params;
  const track = tracksData.find(t => t.id === id);
  if (track) {
    const { title, artist, bpm, key, vibe, subgenre, energyScore, spotifyUrl, reviewQuote, seoDescription, focusKeywords, artistBio, aboutTrack, trackLinks } = req.body;
    
    if (title !== undefined) track.title = title;
    if (artist !== undefined) track.artist = artist;
    if (bpm !== undefined) track.bpm = Number(bpm) || 135;
    if (key !== undefined) track.key = key;
    if (vibe !== undefined) track.vibe = vibe;
    if (subgenre !== undefined) track.subgenre = subgenre;
    if (energyScore !== undefined) track.energyScore = Number(energyScore) || 7;
    if (spotifyUrl !== undefined) track.spotifyUrl = spotifyUrl;
    if (reviewQuote !== undefined) track.reviewQuote = reviewQuote;
    if (seoDescription !== undefined) track.seoDescription = seoDescription;
    if (focusKeywords !== undefined) {
      track.focusKeywords = Array.isArray(focusKeywords) 
        ? focusKeywords 
        : String(focusKeywords).split(",").map(k => k.trim()).filter(Boolean);
    }
    if (artistBio !== undefined) track.artistBio = artistBio;
    if (aboutTrack !== undefined) track.aboutTrack = aboutTrack;
    if (trackLinks !== undefined) track.trackLinks = trackLinks;

    res.json({ success: true, track });
  } else {
    res.status(404).json({ error: "Track not found" });
  }
});

// Admin endpoint to DELETE an active track
app.delete("/api/admin/tracks/:id", (req, res) => {
  const { id } = req.params;
  const index = tracksData.findIndex(t => t.id === id);
  if (index !== -1) {
    tracksData.splice(index, 1);
    res.json({ success: true, message: "Track removed successfully" });
  } else {
    res.status(404).json({ error: "Track not found" });
  }
});

// Gemini extraction API for a track (links, bio, artist, about track)
app.post("/api/gemini/extract", async (req, res) => {
  const { title, artist, spotifyUrl } = req.body;
  if (!title || !artist) {
    return res.status(400).json({ error: "Title and artist are required for AI extraction." });
  }

  if (!ai) {
    // Elegant fallback simulation
    return res.json({
      artistBio: `${artist} is a leading producer of psychedelic progressive trance, popular for weaving crisp low-frequency modulations and atmospheric depth.`,
      aboutTrack: `"${title}" is a peak-hour psychedelic progressive anthem that layers custom synthesizer soundscapes, snappy drums, and driving sub-bass rhythm loops.`,
      trackLinks: `Official Link: ${spotifyUrl || "https://open.spotify.com"}\nBeatport Store: https://www.beatport.com/search?q=${encodeURIComponent(artist + " " + title)}\nSoundcloud Promo: https://soundcloud.com/search?q=${encodeURIComponent(artist + " " + title)}`
    });
  }

  const prompt = `You are a professional electronic music editor and public relations expert for "Bass Hypnosis" playlist.
  Extract or compile detailed professional curator insights for this exact track:
  Track: "${title}" by "${artist}".

  We want to display this on the official fan-dashboard directory. Provide a structured, highly premium output.
  
  Return a raw JSON format output complying exactly with the following typescript structure (Do not add markdown accents like \`\`\`json, just output clean JSON string):
  {
    "artistBio": "A beautifully drafted 45-65 word bio for the artist ${artist}, highlighting their contribution to progressive trance or psytrance vibes.",
    "aboutTrack": "An analytical 45-65 word musical breakdown explanation of the song '${title}' - detailing its synthesizers, kick drums, or twilight groove atmosphere.",
    "trackLinks": "A list of relevant buy and search links formatted as simple line texts, e.g., 'Spotify Track: [URL]\\nBeatport Lossless: [URL]\\nSoundcloud Search: [URL]' with appropriate searches."
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    let cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleanedText);
    res.json(data);
  } catch (error: any) {
    console.error("Single song extraction error:", error);
    res.json({
      artistBio: `${artist} crafts outstanding, highly resonant soundscapes customized for premium underground compilations.`,
      aboutTrack: `"${title}" delivers standard-setting acoustic energy combining lush pads with rolling basslines.`,
      trackLinks: `Spotify stream: ${spotifyUrl || "https://open.spotify.com"}\nBeatport search: https://www.beatport.com/search?q=${encodeURIComponent(artist + " " + title)}`
    });
  }
});

// Gemini bulk AI extract trigger for all songs in the active database
app.post("/api/gemini/extract-all-tracks", async (req, res) => {
  let successCount = 0;
  
  for (const track of tracksData) {
    try {
      if (!ai) {
        // Fallback fills
        track.artistBio = `${track.artist} is an active figure in modern psytrance and progressive, consistently producing deep analog sound designs.`;
        track.aboutTrack = `"${track.title}" is an outstanding progressive trance groove pairing tight transient kicks with beautiful harmonic layers.`;
        track.trackLinks = `Official Spotify: ${track.spotifyUrl || "https://open.spotify.com"}\nBeatport Lossless: https://www.beatport.com/search?q=${encodeURIComponent(track.artist + " " + track.title)}\nSoundCloud Track: https://soundcloud.com/search?q=${encodeURIComponent(track.artist + " " + track.title)}`;
        successCount++;
        continue;
      }

      const prompt = `Provide professional electronic music curation metadata for this track:
      Song: "${track.title}" by "${track.artist}".
      
      Return a raw JSON format output (Do not add markdown accents like \`\`\`json, just output clean JSON string):
      {
        "artistBio": "Backstory (approx 45 words) describing the artist ${track.artist}'s production styles and key impact.",
        "aboutTrack": "Song overview (approx 45 words) praising the groove, BPM transition flow, or synthesizer patterns of '${track.title}'.",
        "trackLinks": "A line-separated list of buy/stream search URLs (e.g., Beatport, Soundcloud) for this track."
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(cleanedText);

      track.artistBio = data.artistBio || "";
      track.aboutTrack = data.aboutTrack || "";
      track.trackLinks = data.trackLinks || "";
      successCount++;

      // Small throttling delay
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (e) {
      console.error(`AI extraction failed on item "${track.title}":`, e);
      track.artistBio = `${track.artist} remains a staple electronic music designer with highly influential sonic templates.`;
      track.aboutTrack = `"${track.title}" layers dark atmospheric synthesis on top of beautiful sub-bass geometries.`;
      track.trackLinks = `Spotify Search: https://open.spotify.com/search/${encodeURIComponent(track.artist + " " + track.title)}`;
    }
  }

  res.json({ success: true, count: successCount, tracks: tracksData });
});


// Vite middleware for development loading, index file routing in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bass Hypnosis Server running on http://localhost:${PORT}`);
  });
}

startServer();
