import mongoose, { Document } from 'mongoose';
import { IUser } from './User';

export interface ISong {
    _id: string;
    title: string;
    postedBy: string;
    platform: "YouTube" | "SoundCloud";
    thumbnailUrl: string;
    platformId: string;
}
export interface IPlaylist extends Document{
    title: string;
    owner: IUser;
    songs: ISong[];
    createdAt: Date;
    updatedAt: Date;
}

const PlaylistSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    owner: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    songs: [
        {
            title: {
                type: String,
                required: true
            },
            postedBy: {
                type: String
            },
            platform: {
                type: String,
                enum: ["YouTube", "SoundCloud"],
                default: "YouTube"
            },
            thumbnailUrl: {
                type: String
            },
            platformId: {
                type: String,
                required: true
            }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export const Playlist = mongoose.model<IPlaylist>("Playlist", PlaylistSchema);
