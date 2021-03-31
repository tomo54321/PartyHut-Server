export interface Song {
    title: string,
    postedBy: string,
    platform: "YouTube" | "SoundCloud",
    thumbnailUrl: string,
    platformId: string
}