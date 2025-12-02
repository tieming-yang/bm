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

const Song = {
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
