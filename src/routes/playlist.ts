import { Router } from 'express';
import { body } from 'express-validator';
import { AddSongToPlaylist, CreatePlaylist, DeletePlaylist, GetPlaylist, ListPlaylists, RemoveSongFromPlaylist, UpdatePlaylist } from '../controllers/playlist';
import { isAuth } from '../middleware/isAuth';
import { ValidateErrors } from '../middleware/validateErrors';
export const PlaylistRouter = Router();

PlaylistRouter.get(
    "/",
    isAuth,
    ListPlaylists
);

PlaylistRouter.post(
    "/",
    body("title")
        .isString()
        .withMessage("Please enter a valid playlist title")
        .trim()
        .escape(),
    ValidateErrors,
    isAuth,
    CreatePlaylist
);

PlaylistRouter.get(
    "/:playlistId",
    isAuth,
    GetPlaylist
);

PlaylistRouter.put(
    "/:playlistId",
    body("title")
        .isString()
        .withMessage("Please enter a valid playlist title")
        .trim()
        .escape(),
    ValidateErrors,
    isAuth,
    UpdatePlaylist
);

PlaylistRouter.delete(
    "/:playlistId",
    ValidateErrors,
    isAuth,
    DeletePlaylist
);


// Songs
PlaylistRouter.put(
    "/:playlistId/song",
    body("songId")
        .isString()
        .withMessage("Please enter a valid song id.")
        .trim()
        .escape(),
    body("platform")
        .isString()
        .withMessage("Please enter a valid platform.")
        .isIn(["YouTube", "SoundCloud"])
        .withMessage("Unsupported platform.")
        .trim()
        .escape(),
    ValidateErrors,
    isAuth,
    AddSongToPlaylist
);

PlaylistRouter.delete(
    "/:playlistId/song/:songId",
    isAuth,
    RemoveSongFromPlaylist
);