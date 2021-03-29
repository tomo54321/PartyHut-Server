import { Song } from "../../@types/Song";
import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

@Entity("playlists")
export class Playlist extends BaseEntity {

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column("text")
    title: string;

    @ManyToOne(() => User, user => user.playlists)
    @JoinColumn()
    owner: Promise<User>;

    @Column("jsonb", { default: [] })
    songs: Song[];


    @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;

    @Column("timestamp", { default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt: Date;

}