import { getModelForClass, modelOptions, prop, Ref, Severity } from "@typegoose/typegoose";
import { Playlist } from "./Playlist";
import { PlaylistSong } from "./PlaylistSong";
import { User } from "./User";

class RoomOnDeck {
    
    @prop({ required: true, default: false })
    public playing: boolean;

    @prop({ default: null })
    public song?: PlaylistSong;

    @prop({ ref: "User", default: null })
    public dj?: User;

    @prop({ ref: "Playlist", default: null })
    public playlist?: Playlist;

    @prop({ default: 0 })
    public current_song_index: number;
}

class DjQueue {

    @prop({ ref: "User", required: true })
    public user: User;

    @prop({ ref: "Playlist", required: true})
    public playlist: Playlist;

}

@modelOptions({ options: { allowMixed: Severity.ERROR } })
export class Room {

    @prop({ required: true })
    public name: string;

    @prop({ required: true, ref: "User" })
    public owner: Ref<User>;

    @prop({ required: true, type: () => RoomOnDeck })
    public on_deck: RoomOnDeck;

    @prop({ type: () => DjQueue })
    public dj_queue: DjQueue[];

    @prop({ default: () => "CURRENT_TIMESTAMP" })
    public created_at: Date;

    @prop({ default: () => "CURRENT_TIMESTAMP" })
    public updated_at: Date;

}

export const RoomModel = getModelForClass(Room);
