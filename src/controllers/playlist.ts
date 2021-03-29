import { Response, Request } from "express";
import { Playlist } from "../database/entity/Playlist";
import { Song } from '../@types/Song';
import { GetDataFromSoundCloud } from "../modules/SoundCloud";
import { GetDataFromYouTube } from "../modules/YouTube";

export const ListPlaylists = async (req: Request, res: Response) => {

    try{
        const playlists = await Playlist.find({
            owner: req.user!
        });

        return res.send({
            ok: true,
            playlists: playlists.map(playlist => ({
                id: playlist.id,
                title: playlist.title,
                totalSongs: playlist.songs.length
            }))
        })
    } catch (e) {
        return res.status(500).send({
            errors: [{
                param: "server",
                msg: "Failed to fetch playlists, please try again."
            }]
        })
    }

};

export const GetPlaylist = async (req: Request, res: Response) => {

    try{
        const playlist = await Playlist.findOne({
            where: {
                id: req.params.playlistId,
                owner: req.user!
            }
        });
        if(!playlist){
            return res.status(404).send({
                errors: [{
                    param: "playlistId",
                    msg: "Playlist couldn't be found."
                }]
            })
        }

        const owner = await playlist.owner;

        return res.send({
            ok: true,
            playlist: {
                id: playlist.id,
                title: playlist.title,
                user: {
                    id: owner.id,
                    username: owner.username
                },
                songs: playlist.songs.map(song => ({
                    title: song.title,
                    postedBy: song.postedBy,
                    thumbnailUrl: song.thumbnailUrl,
                    platform: song.platform,
                    platformId: song.platformId
                }))
            }
        })
    } catch (e) {
        console.error(e);
        return res.status(500).send({
            errors: [{
                param: "server",
                msg: "Failed to fetch playlist, please try again."
            }]
        })
    }

};

export const CreatePlaylist = async (req: Request, res: Response) => {

    try{
        const playlist = Playlist.create({
            title: req.body.title,
            owner: req.user!
        });

        await playlist.save();

        return res.send({
            ok: true,
            playlist: {
                id: playlist.id,
                title: playlist.title
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

    try{
        const playlist = await Playlist.findOne({
            where: {
                id: req.params.playlistId,
                owner: req.user!
            }
        });
        if(!playlist){
            return res.status(404).send({
                errors: [{
                    param: "playlistId",
                    msg: "Playlist couldn't be found."
                }]
            })
        }

        playlist.title = req.body.title;
        await playlist.save();

        return res.send({
            ok: true,
            playlist: {
                title: playlist.title
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

    try{
        const playlist = await Playlist.findOne({
            where: {
                id: req.params.playlistId,
                owner: req.user!
            }
        });
        if(!playlist){
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

    try{
        const playlist = await Playlist.findOne({
            where: {
                id: req.params.playlistId,
                owner: req.user!
            }
        });
        if(!playlist){
            return res.status(404).send({
                errors: [{
                    param: "playlistId",
                    msg: "Playlist couldn't be found."
                }]
            })
        }

        const songs = playlist.songs;
        let songData = null;
        if(req.body.platform === "SoundCloud"){
            songData = await GetDataFromSoundCloud(req.body.songId);
        } else { // YouTube Video?
            songData = await GetDataFromYouTube(req.body.songId);
        }

        songs.push({
            title: songData.title,
            postedBy: songData.postedBy,
            platform: req.body.platform,
            thumbnailUrl: songData.thumbnailURL,
            platformId: req.body.songId
        } as Song);

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

export const RemoveSongFromPlaylist = async (req: Request, res: Response) => {

    try{
        const playlist = await Playlist.findOne({
            where: {
                id: req.params.playlistId,
                owner: req.user!
            }
        });
        if(!playlist){
            return res.status(404).send({
                errors: [{
                    param: "playlistId",
                    msg: "Playlist couldn't be found."
                }]
            })
        }

        const songs = playlist.songs;
        const songIndex = songs.findIndex(song => song.platformId.toString() === req.params.songId);
        if(songIndex < 0){
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
