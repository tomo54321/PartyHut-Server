import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { Room } from "../../database/entity/Room";
import { sendCriticalError } from "../utils/send-critical-error";
import { sendError } from "../utils/send-error";
import { Playlist } from "../../database/entity/Playlist";
import { User } from "../../database/entity/User";
import { socketServer } from "..";

export const roomHandlers = (socket: Socket<DefaultEventsMap, DefaultEventsMap>) => {

    /**
    * Handle joining a room!
    */
    socket.on("join room", async ({ id }: { id: string }) => {

        try {
            const room = await Room.findOne({
                where: {
                    id
                }
            });
            if (!room) {
                sendCriticalError(socket, "Room doesn't exist", "roomId");
                return false;
            }

            // Leave existing room.
            if (socket.data.currentRoom !== undefined) {
                await userLeaveRoom(socket);
            }

            socket.data.currentRoom = room.id;
            socket.join(room.id);
            socket.to(room.id).emit("user join", {
                id: socket.id,
                username: socket.data.profile.username
            });

            const room_host = await room.owner;

            socket.emit("joined room", {
                id: room.id,
                name: room.name,
                host: {
                    id: room_host.id,
                    username: room_host.username
                },
                on_deck: {
                    playing: room.is_playing,
                    platform: room.current_playing_platform,
                    platformId: room.current_playing_platform_id,
                    songStartedAt: room.current_song_started_at,

                    current_dj: room.current_dj?.id || null
                },
                is_dj: room.current_dj !== null && room.current_dj.id === socket.data.profile.id,
                in_queue: room.current_dj_queue.findIndex(dj => dj.userId === socket.data.profile.id) > -1
            });

            return true;

        } catch (e) {
            console.error(e);
            sendCriticalError(socket, "Failed to check if the room exists");
            return false;
        }

    });

    /**
     * Handle user joining DJ Queue
     */
    socket.on("join queue", async ({ playlistId }: { playlistId: string }) => {

        try {

            // Fetch the room
            const room = await Room.findOne({
                where: {
                    id: socket.data.currentRoom
                }
            });
            if (!room) {
                return sendError(socket, "An unexpected error occured, please try again");
            }

            // Check if the user is already in the DJ queue or if they're currently DJing?
            const alreadyInQueue = room.current_dj_queue.findIndex(dj => dj.userId === socket.data.profile.id) > -1;
            const alreadyDJ = room.current_dj !== null && room.current_dj.id === socket.data.profile.id;
            if (alreadyInQueue || alreadyDJ) {
                return sendError(socket, "You are already in the DJ queue");
            }

            // Fetch the playlist selected.
            const playlist = await Playlist.findOne({
                id: playlistId,
                owner: socket.data.profile.id
            });
            if (!playlist) {
                return sendError(socket, "Playlist not found.");
            }

            // No one is in the queue and there is no DJ
            if (room.current_dj_queue.length === 0 && !room.is_playing) {
                return await setRoomDJ(socket, room, socket.data.profile, playlist);
            }

            // Add the user to the end of the DJ Queue.
            room.current_dj_queue.push({
                userId: socket.data.profile.id,
                playlistId: playlist.id
            });
            await room.save();

            return socket.emit("joined queue");

        } catch (e) {
            console.error(e);
            return sendError(socket, "Failed to verify playlist.");
        }

    });

    /**
     * When a song has finished for the DJ
     */
    socket.on("song finished", async () => {
        try {
            const room = await Room.findOne({
                where: {
                    id: socket.data.currentRoom
                }
            });
            // Room not found.
            if (!room) {
                sendCriticalError(socket, "Room doesn't exist", "roomId");
                return false;
            }

            // Some reason the deck is no longer playing anything.
            if (!room.is_playing) {
                return sendError(socket, "Something went wrong");
            }

            // The user's ID doesn't match the DJ's ID
            if (!room.current_dj || room.current_dj.id !== socket.data.profile.id) {
                console.log("User tried to change the song but isn't dj");
                return;
            }

            const playlist = room.current_playlist;

            // The playlist no longer exists
            if (!playlist) {
                // Remove the user as a DJ
                return sendError(socket, "Your playlist no longer exists, you have been removed from the decks.");
            }

            // The song just heard was the last one?
            if (room.current_song_index === null || room.current_song_index >= (playlist.songs.length - 1)) {
                // We've reached the end of the playlist remove as DJ
                console.log("END OF PLAYLIST!");
                console.log(room.current_song_index, playlist.songs.length);
                return;
            }

            const nextSongIndex = room.current_song_index! + 1;
            const nextSong = playlist.songs[nextSongIndex];

            const newDeck = {
                playing: true,
                platform: nextSong.platform,
                platformId: nextSong.platformId,
                songStartedAt: Date.now() as any
            };

            // Update room playing state
            room.is_playing = true;
            room.current_playing_platform = nextSong.platform;
            room.current_playing_platform_id = nextSong.platformId;
            room.current_song_started_at = new Date();
            room.current_song_index = nextSongIndex;
            await room.save();

            socketServer.in(room.id).emit("deck change", { ...newDeck, current_dj: room.current_dj!.id });
            return true;

        } catch (e) {
            console.error(e);
            return sendCriticalError(socket, "Failed to load next song.", "roomId");
        }
    });



    /**
     * Basic chat messages
     */
    socket.on("send chat message", ({ message }: { message: string }) => {
        if (socket.data.currentRoom === undefined) { // User isn't in a room (how are they even connected?)
            socket.disconnect();
            return;
        }

        // Sending a message within a 1 second window (possible spam!)
        if (socket.data.lastChatMessage !== undefined && socket.data.lastChatMessage > (Date.now() - 1000)) {
            return;
        }
        // Store last message sent.
        socket.data.lastChatMessage = Date.now();

        socket.to(socket.data.currentRoom).emit("receive chat message", {
            id: Math.round(Math.random() * 9999) + Date.now(),
            username: socket.data.profile.username,
            message
        });

    });

    /**
     * Handle socket disconnecting and rooms
     */
    socket.on("disconnect", async () => {
        if (socket.data.currentRoom === undefined) {
            return;
        }

        await userLeaveRoom(socket);

    });

}

const userLeaveRoom = async (
    socket: Socket<DefaultEventsMap, DefaultEventsMap>,
) => {
    if (!socket.data.currentRoom) {
        return false;
    }

    const roomId = socket.data.currentRoom;
    socket.to(roomId).emit("user leave", { id: socket.data.profile._id.toString() });
    socket.leave(roomId);

    try {

        const room = await Room.findOne({
            where: {
                id: roomId
            }
        });

        if (!room) {
            console.error("Room was deleted");
            return false;
        }

        const inQueue = room.current_dj_queue.findIndex(dj => dj.userId === socket.data.profile.id) > -1;
        const isDJ = room.current_dj !== null && room.current_dj.id === socket.data.profile.id;

        if (inQueue) {
            const queue = room.current_dj_queue;
            const my_queue_index = room.current_dj_queue.findIndex(dj => dj.userId === socket.data.profile.id);
            queue.splice(my_queue_index, 1);
            room.current_dj_queue = queue;
            await room.save();
        }

        // Do stuff if the user is a DJ
        if (isDJ) {

        }
        return true;


    } catch (e) {
        console.error("Failed to verify if user was DJ or in DJ queue");
        return false
    }
}

const setRoomDJ = async (
    socket: Socket<DefaultEventsMap, DefaultEventsMap>,
    room: Room,
    user: User,
    playlist: Playlist
) => {

    try {
        const currentSong = playlist.songs[0];
        const newDeck = {
            playing: true,
            platform: currentSong.platform,
            platformId: currentSong.platformId,
            songStartedAt: Date.now() as any
        };

        room.is_playing = true;
        room.current_playing_platform = currentSong.platform;
        room.current_playing_platform_id = currentSong.platformId;
        room.current_song_started_at = new Date();
        room.current_song_index = 0;

        room.current_dj = user;
        room.current_playlist = playlist;
        await room.save();

        socketServer.in(room.id).emit("deck change", { ...newDeck, current_dj: user.id });

        socket.emit("became dj");

    } catch (e) {
        console.error(e);
    }

}