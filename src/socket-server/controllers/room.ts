import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { IRoom, Room } from "../../models/Room";
import { sendCriticalError } from "../utils/send-critical-error";
import { isValidObjectId } from 'mongoose';
import { sendError } from "../utils/send-error";
import { IPlaylist, Playlist } from "../../models/Playlist";
import { IUser } from "src/models/User";
import { socketServer } from "..";

export const roomHandlers = (socket: Socket<DefaultEventsMap, DefaultEventsMap>) => {

    /**
    * Handle joining a room!
    */
    socket.on("join room", async ({ id }: { id: string }) => {

        if(!isValidObjectId(id)){
            return sendCriticalError(socket, "Room doesn't exist");
        }

        try {
            const room = await Room.findById(id)
            .populate("owner");
            if(!room){
                sendCriticalError(socket, "Room doesn't exist", "roomId");
                return false;
            }

            // Leave existing room.
            if (socket.data.currentRoom !== undefined) {
                await userLeaveRoom(socket);
            }

            socket.data.currentRoom = room._id;
            socket.join(room.id);
            socket.to(room.id).emit("user join", { 
                id: socket.id, 
                username: socket.data.profile.username 
            });
            
            socket.emit("joined room", {
                id: room.id,
                name: room.name,
                host: {
                    id: room.owner.id,
                    username: room.owner.username
                },
                on_deck: {
                    playing: room.on_deck.playing,
                    platform: room.on_deck.platform,
                    platformId: room.on_deck.platformId,
                    songStartedAt: room.on_deck.songStartedAt?.getTime() || null,

                    current_dj: room.on_deck.dj?._id || null
                },
                is_dj: room.on_deck.dj?._id.toString() === socket.data.profile._id.toString(),
                in_queue: room.dj_queue.findIndex(dj => dj.user._id.toString() === socket.data.profile._id.toString()) > -1
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
    socket.on("join queue", async ({ playlistId } : { playlistId: string }) => {
        
        if(!isValidObjectId(playlistId)){
            return sendError(socket, "Invalid Playlist");
        }

        try{
            
            // Fetch the room
            const room = await Room.findById(socket.data.currentRoom);
            if(!room){
                return sendError(socket, "An unexpected error occured, please try again");
            }

            // Check if the user is already in the DJ queue or if they're currently DJing?
            const alreadyInQueue = room.dj_queue.findIndex(dj => dj.user._id.toString() === socket.data.profile._id.toString()) > -1;
            const alreadyDJ = room.on_deck.dj?._id.toString() === socket.data.profile._id.toString();
            if(alreadyInQueue || alreadyDJ){
                return sendError(socket, "You are already in the DJ queue");
            }

            // Fetch the playlist selected.
            const playlist = await Playlist.findOne({
                _id: playlistId,
                owner: socket.data.profile._id
            });
            if(!playlist){
                return sendError(socket, "Playlist not found.");
            }

            // No one is in the queue and there is no DJ
            if(room.dj_queue.length === 0 && !room.on_deck.playing){
                return await setRoomDJ(socket, room, socket.data.profile, playlist);
            }

            // Add the user to the end of the DJ Queue.
            await Room.updateOne({
                _id: socket.data.currentRoom
            }, {
                $push: {
                    dj_queue: {
                        user: socket.data.profile._id,
                        playlist: playlist._id
                    }
                }
            });

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
        try{
            const room = await Room.findById(socket.data.currentRoom);
            // Room not found.
            if(!room){
                sendCriticalError(socket, "Room doesn't exist", "roomId");
                return false;
            }

            // Some reason the deck is no longer playing anything.
            if(!room.on_deck.playing){
                return sendError(socket, "Something went wrong");
            }

            // The user's ID doesn't match the DJ's ID
            if(room.on_deck.dj!._id.toString() !== socket.data.profile._id.toString()){
                return;
            }

            const playlist = await Playlist.findById(room.on_deck.playlist);

            // The playlist no longer exists
            if(!playlist){
                // Remove the user as a DJ
                return sendError(socket, "Your playlist no longer exists, you have been removed from the decks.");
            }

            // The song just heard was the last one?
            if(!room.on_deck.current_song_index || room.on_deck.current_song_index >= (playlist.songs.length - 1)){
                // We've reached the end of the playlist remove as DJ

                return;
            }

            const nextSongIndex = room.on_deck.current_song_index! + 1;
            const nextSong = playlist.songs[nextSongIndex];

            const newDeck = {
                playing: true,
                platform: nextSong.platform,
                platformId: nextSong.platformId,
                songStartedAt: Date.now() as any
            };
    
            room.on_deck = {
                ...newDeck,
                dj: room.on_deck.dj,
                playlist: room.on_deck.playlist,
                current_song_index: nextSongIndex
            };
            await room.save();
    
            socketServer.in(room.id).emit("deck change", { ...newDeck, current_dj: room.on_deck.dj });
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
        if(socket.data.lastChatMessage !== undefined && socket.data.lastChatMessage > (Date.now() - 1000)){
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
        if(socket.data.currentRoom === undefined){
            return;
        }

        await userLeaveRoom(socket);

    });

}

const userLeaveRoom = async (
    socket: Socket<DefaultEventsMap, DefaultEventsMap>,
) => {
    if(!socket.data.currentRoom){
        return false;
    }

    const roomId = socket.data.currentRoom;
    socket.to(roomId).emit("user leave", { id: socket.data.profile._id.toString() });
    socket.leave(roomId);

    try{

        const room = await Room.findById(roomId);
        if(!room){
            console.error("Room was deleted");
            return false;
        }

        const inQueue = room.dj_queue.findIndex(dj => dj.user._id.toString() === socket.data.profile._id.toString()) > -1;
        const isDJ = room.on_deck.dj?._id.toString() === socket.data.profile._id.toString();

        if(inQueue){
            await Room.updateOne({
                _id: socket.data.currentRoom
            }, {
                $pull: {
                    dj_queue: {
                        user: socket.data.profile._id
                    }
                }
            });
        }

        // Do stuff if the user is a DJ
        if(isDJ){

        }
        return true;


    } catch (e) {
        console.error("Failed to verify if user was DJ or in DJ queue");
        return false
    }
}

const setRoomDJ = async (
    socket: Socket<DefaultEventsMap, DefaultEventsMap>,
    room: IRoom,
    user: IUser,
    playlist: IPlaylist
) => {

    try {
        const currentSong = playlist.songs[0];
        const newDeck = {
            playing: true,
            platform: currentSong.platform,
            platformId: currentSong.platformId,
            songStartedAt: Date.now() as any
        };

        room.on_deck = {
            ...newDeck,
            dj: user,
            playlist,
            current_song_index: 0
        };
        await room.save();

        socketServer.in(room.id).emit("deck change", { ...newDeck, current_dj: user._id.toString() });

        socket.emit("became dj");

    } catch (e){
        console.error(e);
    }

}