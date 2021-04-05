import { getModelForClass, modelOptions, prop, Ref, Severity } from "@typegoose/typegoose";
import { PlaylistSong } from "./PlaylistSong";
import { User } from './User';

@modelOptions({ options: { allowMixed: Severity.ERROR } })
export class Playlist {

    public _id: any;
    public id: any;

    @prop({ required: true })
    public name: string;

    @prop({ required: true, ref: "User" })
    public owner: Ref<User>;

    @prop({ type: () => PlaylistSong })
    public songs: PlaylistSong[];

    @prop({ default: Date.now() })
    public created_at: Date;

    @prop({ default: Date.now() })
    public updated_at: Date;
}

export const PlaylistModel = getModelForClass(Playlist);