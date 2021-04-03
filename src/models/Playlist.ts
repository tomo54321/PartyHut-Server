import { getModelForClass, prop, Ref } from "@typegoose/typegoose";
import { PlaylistSong } from "./PlaylistSong";
import { User } from './User';

export class Playlist {
    
    @prop({ required: true })
    public name: string;

    @prop({ required: true })
    public owner: Ref<User>;

    @prop()
    public songs: Ref<PlaylistSong>[];

    @prop({ default: () => "CURRENT_TIMESTAMP" })
    public created_at: Date;

    @prop({ default: () => "CURRENT_TIMESTAMP" })
    public updated_at: Date;
}

export const PlaylistModel = getModelForClass(Playlist);