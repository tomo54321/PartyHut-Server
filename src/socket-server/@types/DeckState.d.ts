import { Playlist } from "src/database/entity/Playlist";
import { User } from "src/database/entity/User";

export interface DeckState {
    playing: boolean;
    platform: null | "YouTube" | "SoundCloud";
    platformId: null | string;
    currentSongIndex: number;
    current_dj?: null | User;
    playlist?: null | Playlist;
    songStartedAt: null | Date;
}