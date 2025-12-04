import Config from "./config";

export type Song = {
  id: string;
  title: string;
  genre: string;
  isPublic: boolean;
  lyrics: string;
  fileUrl: string;
  createdAt: string;
};

export type LyricLine = {
  lineNumber: string;
  timestamp: number;
  text: string;
};

const Song = {
  formatTimestamp: (timestamp: number): string => {
    const minutes = Math.floor(timestamp / 60)
    const seconds = Math.floor(timestamp % 60)

    return `${minutes}:${seconds >= 10 ? "" : 0}${seconds}`
  },
  formatLyrics: (rawLyrics: string): LyricLine[] => {
    const lyrics = rawLyrics.split("\n\n").reduce<LyricLine[]>((acc, fields) => {
      const [lineNumber, srtTimestamp, text] = fields.split("\n");
      const timestamp = Song.timestampToSeconds(srtTimestamp, { srt: true });
      acc.push({ lineNumber, timestamp, text });

      return acc;
    }, []);

    return [{ lineNumber: "0", timestamp: 0, text: "intro" }, ...lyrics];
  },
  timestampToSeconds(
    timestamp: string | number,
    option?: { srt: boolean }
  ): number {
    if (!timestamp) return 0;
    if (typeof timestamp === "number") return Math.round(timestamp);

    if (option?.srt) {
      const [rawStart, rawEnd] = timestamp.split(/\s*-->\s*/);
      if (!rawStart) {
        console.error("No match SRT format");
        return 0;
      }

      const match = rawStart?.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
      if (!match) {
        console.error("No capture matched");
        return 0;
      }

      const [, hours, minutes, seconds, millis] = match;
      const totalSeconds =
        Number(hours) * 3600 +
        Number(minutes) * 60 +
        Number(seconds) +
        Number(millis) / 1000;

      return Math.round(totalSeconds);
    }

    const [minutes, seconds] = timestamp.split(":");

    return Math.round(Number(minutes) * 60 + Number(seconds));
  },

  toShuffled: (songs: Song[]): Song[] => {
    let shuffled = [...songs]
    for (let i = shuffled.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1)) as number
      
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled
  },

  getAll: async (): Promise<Song[]> => {
    const res = await fetch(`${Config.baseUrl}/api/songs`, { cache: "force-cache" });
    if (!res.ok) {
      throw new Error("Failed to fetch songs from API");
    }
    return res.json();
  },
};


export type { Song as SongType }
export default Song;
