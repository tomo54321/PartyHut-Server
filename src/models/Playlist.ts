import { getModelForClass, modelOptions, prop, Ref, Severity } from "@typegoose/typegoose";
import { PlaylistSong } from "./PlaylistSong";
import { User } from './User';

@modelOptions({ options: { allowMixed: Severity.ERROR } })
export class Playlist {
    
    @prop({ required: true })
    public name: string;

    @prop({ required: true, ref: "User" })
    public owner: Ref<User>;

    @prop({ type: () => PlaylistSong })
    public songs: PlaylistSong[];

    @prop({ default: () => "CURRENT_TIMESTAMP" })
    public created_at: Date;

    @prop({ default: () => "CURRENT_TIMESTAMP" })
    public updated_at: Date;
}

export const PlaylistModel = getModelForClass(Playlist);