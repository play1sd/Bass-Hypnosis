export interface Song {
  id: string;
  slug?: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  vibe: string;
  subgenre: string;
  energyScore: number;
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

export interface Submission {
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

export interface Analytics {
  totalSubmissions: number;
  pendingCount: number;
  approvedCount: number;
  declinedCount: number;
  totalActiveSongs: number;
  genreDistribution: { [key: string]: number };
  totalVotesOnSite: number;
  avgEnergy: number;
  customSubmissionsCount: number;
}

export interface Subscriber {
  id: string;
  email: string;
  name: string;
  enrolledAt: string;
}

export interface EmailDispatchLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  trackTitle: string;
  trackArtist: string;
  sentAt: string;
  status: "delivered";
}

