export interface SongSearchResult {
    id: string;
    title: string;
    artist: string;
    platform: "YouTube" | "SoundCloud";
    artwork: string;
    platform_id: string;
}