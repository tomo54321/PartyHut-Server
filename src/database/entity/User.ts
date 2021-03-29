import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Playlist } from "./Playlist";
import { Room } from "./Room";

@Entity("users")
export class User extends BaseEntity {

    @PrimaryGeneratedColumn("uuid")
    id: number;

    @Column("text", {
        unique: true
    })
    username: string;

    @Column("text", {
        unique: true
    })
    email: string;

    @Column("text")
    password: string;

    @OneToMany(() => Playlist, playlist => playlist.owner, { onDelete: "CASCADE" })
    playlists: Playlist[];

    @OneToMany(() => Room, room => room.owner, { onDelete: "CASCADE" })
    rooms: Room[];

    @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
    createdAt: number;

    @Column("timestamp", { default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt: number;
}