import { PlaylistSong } from "src/models/PlaylistSong";
import { Playlist } from "../../models/Playlist";
import { User } from "../../models/User";

export interface DeckState {
    playing: boolean;
    song?: PlaylistSong;
    currentSongIndex: number;
    current_dj?: User;
    playlist?: Playlist;
    song_start_time: null | Date;
}