import mongoose, { Document } from 'mongoose';
import { IPlaylist } from './Playlist';
import { IUser } from './User';

interface IRoomOnDeck {
    playing: Boolean;
    platform: "YouTube" | "SoundCloud" | null;
    platformId: string | null;
    songStartedAt: Date | null;
    dj: IUser | null;
    playlist: IPlaylist | null;
    current_song_index: number | null;
}

interface IRoomDJQueue {
    user: IUser;
    playlist: IPlaylist;
}

export interface IRoom extends Document{
    name: string;
    owner: IUser;
    on_deck: IRoomOnDeck;
    dj_queue: IRoomDJQueue[];
    createdAt: Date;
    updatedAt: Date;
}

const RoomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },

    on_deck: {
        playing: {
            type: Boolean,
            default: false
        },
        platform: {
            type: String,
            enum: ["YouTube", "SoundCloud"],
            default: null
        },
        platformId: {
            type: String,
            default: null
        },
        songStartedAt: {
            type: Date,
            default: null
        },

        dj: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            default: null
        },
        playlist: {
            type: mongoose.Types.ObjectId,
            ref: "Playlist",
            default: null
        },
        current_song_index: {
            type: Number,
            default: 0
        }
    },

    dj_queue: [
        {
            user: {
                type: mongoose.Types.ObjectId,
                ref: "User"
            },
            playlist: {
                type: mongoose.Types.ObjectId,
                ref: "Playlist"
            }
        }
    ],

    createdAt: {
        type: Date,
        default: Date.now()
    },
    updatedAt: {
        type: Date,
        default: Date.now()
    }
});

export const Room = mongoose.model<IRoom>("Room", RoomSchema);
