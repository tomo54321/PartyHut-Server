import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { Playlist } from "./Playlist";
import { DJQueue } from "src/@types/DJQueue";

@Entity("rooms")
export class Room extends BaseEntity {

    /**
     * Essential Room Stuff
     */
    @PrimaryGeneratedColumn("uuid")
    id: number;

    @Column("text")
    name: string;

    @ManyToOne(() => User, user => user.rooms)
    @JoinColumn()
    owner: Promise<User>;


    /**
     * Current playing stuff
     */
    @Column("boolean", { default: false })
    is_playing: boolean;

    @Column("text", { nullable: true })
    current_playing_platform: "YouTube" | "SoundCloud" | null;

    @Column("timestamp", { default: null })
    current_song_started_at: number | null;

    @OneToOne(() => User, { nullable: true, eager: true })
    @JoinColumn()
    current_dj: User | null;

    @OneToOne(() => Playlist, { nullable: true, eager: true })
    @JoinColumn()
    current_playlist: Playlist | null;

    @Column("int", { default: null, nullable: true })
    current_song_index: number | null;


    /**
     * DJ Queue
     */

    @Column("jsonb", { default: [] })
    current_dj_queue: DJQueue[];



    /**
     * Generic Room Stuff
     */
    @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
    createdAt: number;

    @Column("timestamp", { default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
    updatedAt: number;

}