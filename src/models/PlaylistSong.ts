import { prop } from "@typegoose/typegoose";

export class PlaylistSong {
    
    @prop({ required: true })
    public title: string;

    @prop({ required: true })
    public artist: string;

    @prop({ enum: ["YouTube", "SoundCloud"], default: "YouTube" })
    public platform: "YouTube" | "SoundCloud";

    @prop({ required: true})
    public platform_id: string;

    @prop()
    public artwork: string;

    @prop({ required: true })
    public duration: number;

}