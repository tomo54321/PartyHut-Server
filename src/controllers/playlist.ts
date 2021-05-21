import { Response, Request } from "express";
import { isValidObjectId } from "mongoose";
import { PlaylistModel } from "../models/Playlist";
import { GetDataFromSoundCloud } from "../modules/SoundCloud";
import { GetDataFromYouTube } from "../modules/YouTube";

export const ListPlaylists = async (req: Request, res: Response) => {

    try {
        const playlists = await PlaylistModel.find({
            owner: req.user!
        });

        return res.send({
            ok: true,
            playlists: playlists.map(playlist => ({
                id: playlist.id,
                name: playlist.name,
                artwork: playlist.songs[0]?.artwork || "http://placehold.it/250x250",
                total_songs: playlist.songs.length
            }))
        })
    } catch (e) {
        console.log(e);
        return res.status(500).send({
            errors: [{
                param: "server",
                msg: "Failed to fetch playlists, please try again."
            }]
        })
    }

};

export const GetPlaylist = async (req: Request, res: Response) => {

    if(!isValidObjectId(req.params.playlistId)){
        return res.status(404).send({
            errors: [{
                param: "playlistId",
                msg: "Playlist not found."
            }]
        })
    }

    try {
        const playlist = await PlaylistModel.findOne({
            _id: req.params.playlistId,
            owner: req.user!
        }).populate("owner");
        if (!playlist) {
            return res.status(404).send({
                errors: [{
                    param: "playlistId",
                    msg: "Playlist couldn't be found."
                }]
            })
        }

        return res.send({
            ok: true,
            playlist: {
                id: playlist.id,
                name: playlist.name,
                artwork: playlist.songs[0]?.artwork || "http://placehold.it/250x250",
                total_songs: playlist.songs.length,
                user: {
                    id: (playlist.owner! as any)._id,
                    username: (playlist.owner! as any).username
                },
                songs: playlist.songs.map(song => ({
                    id: (song as any).id,
                    title: song.title,
                    artist: song.artist,
                    artwork: song.artwork,
                    duration: song.duration,
                    platform: song.platform,
                    platform_id: song.platform_id
                }))
            }
        })
    } catch (e) {
        return res.status(500).send({
            errors: [{
                param: "server",
                msg: "Failed to fetch playlist, please try again."
            }]
        })
    }

};

export const CreatePlaylist = async (req: Request, res: Response) => {

    try {
        const playlist = await PlaylistModel.create({
            name: req.body.name,
            owner: req.user!
        });

        return res.send({
            ok: true,
            playlist: {
                id: playlist.id,
                name: playlist.name
            }
        })
    } catch (e) {
        console.log(e);
        return res.status(500).send({
            errors: [{
                param: "server",
                msg: "Failed to create playlist, please try again."
            }]
        })
    }

};

export const UpdatePlaylist = async (req: Request, res: Response) => {

    if(!isValidObjectId(req.params.playlistId)){
        return res.status(404).send({
            errors: [{
                param: "playlistId",
                msg: "Playlist not found."
            }]
        })
    }

    try {
        const playlist = await PlaylistModel.findOne({
            _id: req.params.playlistId,
            owner: req.user!
        });
        if (!playlist) {
            return res.status(404).send({
                errors: [{
                    param: "playlistId",
                    msg: "Playlist couldn't be found."
                }]
            })
        }

        playlist.name = req.body.name;
        await playlist.save();

        return res.send({
            ok: true,
            playlist: {
                name: playlist.name
            }
        })
    } catch (e) {
        return res.status(500).send({
            errors: [{
                param: "server",
                msg: "Failed to fetch and update playlist, please try again."
            }]
        })
    }

};

export const DeletePlaylist = async (req: Request, res: Response) => {

    try {
        const playlist = await PlaylistModel.findOne({
            _id: req.params.playlistId,
            owner: req.user!

        });
        if (!playlist) {
            return res.status(404).send({
                errors: [{
                    param: "playlistId",
                    msg: "Playlist couldn't be found."
                }]
            })
        }

        await playlist.remove();

        return res.send({
            ok: true,
            playlist: {
                id: req.params.playlistId
            }
        })
    } catch (e) {
        console.log(e);
        return res.status(500).send({
            errors: [{
                param: "server",
                msg: "Failed to fetch and update playlist, please try again."
            }]
        })
    }

};


// Songs
export const AddSongToPlaylist = async (req: Request, res: Response) => {

    try {
        const playlist = await PlaylistModel.findOne({
            _id: req.params.playlistId,
            owner: req.user!
        });
        if (!playlist) {
            return res.status(404).send({
                errors: [{
                    param: "playlistId",
                    msg: "Playlist couldn't be found."
                }]
            })
        }

        let songData = null;
        if (req.body.platform === "SoundCloud") {
            songData = await GetDataFromSoundCloud(req.body.songId);
        } else { // YouTube Video?
            songData = await GetDataFromYouTube(req.body.songId);
        }

        await PlaylistModel.updateOne({
            _id: req.params.playlistId,
            owner: req.user!
        }, {
            $push: {
                songs:{
                    title: songData.title,
                    artist: songData.artist,
                    platform: req.body.platform,
                    platform_id: req.body.songId,
                    artwork: songData.artwork,
                    duration: songData.duration
                } 
            }
        })

        return res.send({
            ok: true
        })
    } catch (e) {
        console.log(e);
        return res.status(500).send({
            errors: [{
                param: "server",
                msg: "Failed to fetch and update playlist, please try again."
            }]
        })
    }

};

export const RemoveSongFromPlaylist = async (req: Request, res: Response) => {

    try {
        const playlist = await PlaylistModel.findOne({
            _id: req.params.playlistId,
            owner: req.user!
        });
        if (!playlist) {
            return res.status(404).send({
                errors: [{
                    param: "playlistId",
                    msg: "Playlist couldn't be found."
                }]
            })
        }

        const songs = playlist.songs;
        const songIndex = songs.findIndex(song => (song as any).id === req.params.songId);
        if (songIndex < 0) {
            return res.status(404).send({
                errors: [{
                    param: "songId",
                    msg: "Song doesn't exist in this playlist.",
                }]
            })
        }

        songs.splice(songIndex, 1);

        playlist.songs = songs;
        await playlist.save();

        return res.send({
            ok: true,
            playlist: {
                songs
            }
        })
    } catch (e) {
        return res.status(500).send({
            errors: [{
                param: "server",
                msg: "Failed to fetch and update playlist, please try again."
            }]
        })
    }

};
