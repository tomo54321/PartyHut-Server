import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { Playlist, PlaylistModel } from "../../models/Playlist";
import { Room, RoomModel } from "../../models/Room";
import { User, UserModel } from "../../models/User";
import { socketServer } from "..";
import { DeckState } from "../@types/DeckState";
import { sendCriticalError } from "../utils/send-critical-error";
import { sendError } from "../utils/send-error";
import { isValidObjectId } from "mongoose";

export const roomHandlers = (socket: Socket<DefaultEventsMap, DefaultEventsMap>) => {

    /**
     * Socket join room event
     */
    socket.on("join room", async ({ id }: { id: string }) => {
        if(!isValidObjectId(id)){
            sendCriticalError(socket, "Room doesn't exist.", "roomId");
            return socket.disconnect();
        }

        try {
            const room = await RoomModel.findOne({ _id: id })
                .populate("owner").exec();
            if (!room) {
                sendCriticalError(socket, "Room doesn't exist.", "roomId");
                return socket.disconnect();
            }
            return await onSocketJoinRoom(socket, room);
        } catch (e) {
            console.error(e);
            sendCriticalError(socket, "Failed to find room", "server");
            return socket.disconnect();
        }

    });

    /**
     * Handle user joining DJ Queue
     */
    socket.on("join queue", async ({ playlistId }: { playlistId: string }) => {

        if(!isValidObjectId(playlistId)){
            sendError(socket, "Invalid playlist.", "playlistId");
            return socket.disconnect();
        }

        try {
            // Fetch the current room.
            const room = await RoomModel.findOne({_id: socket.data.currentRoom});
            if (!room) {
                return handleRoomDoesntExist(socket.data.currentRoom);
            }
            // Fetch the current user
            const user: User = socket.data.profile;
            // Fetch the playlist to join with.
            const playlist = await PlaylistModel.findOne({
                _id: playlistId,
                owner: user
            });
            if (!playlist) {
                return sendError(socket, "That playlist couldn't be found");
            }

            // Is the socket the DJ or in the queue already?
            if (isSocketInDJQueue(room, user) || isSocketDJ(room, user)) {
                return sendError(socket, "You are already in the queue or you are djing.");
            }

            return onSocketJoinDJQueue(room, user, playlist);

        } catch (e) {
            console.error(e);
            return sendError(socket, "Failed to join the queue");
        }

    });

    /**
     * The DJ has requested to go to the next song.
     */
    socket.on("next song", async () => {
        console.log("NEXT SONG!");
        try {
            // Fetch the current room.
            const room = await RoomModel.findOne({_id: socket.data.currentRoom});
            if (!room) {
                console.log("ROOM NEIN FOUND!");
                return handleRoomDoesntExist(socket.data.currentRoom);
            }
            const user = socket.data.profile;

            if (isSocketDJ(room, user) && room.on_deck.playing) {

                // Song has been going longer than 10 seconds?
                if (room.on_deck.current_song_start_at!.getTime() < (Date.now() - 10000)) {
                    return onSocketSkipSong(room);
                } else {
                    return sendError(socket, "Hold up! You need to wait before skipping this song.");
                }

            } else {
                console.log("User tried to change the song but the room isn't playing or they're not a DJ")
            }

        } catch (e) {
            console.error(e);
            return sendError(socket, "Failed to join the queue");
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
            created_at: new Date(),
            message
        });

    });


    /**
     * Handle socket leave
     */
    socket.on("disconnect", () => {
        onSocketLeaveRoom(socket);
    });

}



const onSocketJoinRoom = async (
    socket: Socket<DefaultEventsMap, DefaultEventsMap>,
    room: Room
) => {

    // Set the sockets room to this one
    socket.data.currentRoom = (room as any).id;

    // Join the room in socket.io
    socket.join((room as any).id);

    // Let other users know someone joined!
    socket.to((room as any).id).emit("user join", {
        id: socket.data.profile.id,
        username: socket.data.profile.username
    });

    // Fetch the rooms owner
    const owner = room.owner;

    // Send the joined response to the user
    socket.emit("joined room", {
        id: (room as any).id,
        name: room.name,
        owner: {
            id: (owner! as any)._id,
            username: (owner! as User).username
        },
        users: getUsersInRoom((room as any).id),
        on_deck: {
            playing: room.on_deck.playing,
            song: room.on_deck.song || null,
            song_start_time: room.on_deck.current_song_start_at,

            current_dj: room.on_deck.dj || null
        },
        is_dj: isSocketDJ(room, socket.data.profile),
        in_queue: isSocketInDJQueue(room, socket.data.profile)
    });

    return;

}

const onSocketLeaveRoom = async (
    socket: Socket<DefaultEventsMap, DefaultEventsMap>
) => {

    // User wasn't in a room.
    if (!socket.data.currentRoom) { return; }

    // Get the room id
    const roomId = socket.data.currentRoom;
    try {
        // Find the current room
        const room = await RoomModel.findOne({_id: roomId});
        // Room no longer exists?
        if (!room) {
            // Disconnect everyone in the non-existing room.
            handleRoomDoesntExist(roomId);
            console.error("Room was deleted but user was still in it?");
            return;
        }
        // Get the current user
        const user: User = socket.data.profile;

        // Check if user in the queue to be a dj
        const isInQueue = isSocketInDJQueue(room, user);
        // Check if the user is a dj
        const isDJ = isSocketDJ(room, user);

        // Let other users know someone left!
        socket.to((room as any).id).emit("user leave", {
            id: socket.data.profile.id
        });
        // If the user was in the queue
        if (isInQueue) {
            // Remove them from it.
            removeUserFromQueue(user, room);
        } else if (isDJ) {
            switchToNextDJ(room);
        }

    } catch (e) {
        console.error("Something went wrong when finding the room or updating the dj / room")
        return;
    }

};

const onSocketJoinDJQueue = async (
    room: Room,
    user: User,
    playlist: Playlist
) => {

    room.dj_queue.push({
        user: user,
        playlist: playlist
    });

    // If this is the only user in the queue.
    if (room.on_deck.playing === false) {
        return switchToNextDJ(room);
    }

    // Otherwise add to the queue.
    await (room as any).save();

    return socketServer.to(user.id.toString()).emit("joined queue");

};

const onSocketSkipSong = async (
    room: Room
) => {

    const playlist = await PlaylistModel.findOne({ _id: room.on_deck.playlist });
    if(!playlist){ // They've removed their playlist.
        return switchToNextDJ(room);
    }
    if (room.on_deck.current_song_index === (playlist.songs.length - 1)) {
        console.log("Going to next DJ");
        return switchToNextDJ(room);
    }

    const newSongIndex = room.on_deck.current_song_index! + 1;
    const nextSong = playlist.songs[newSongIndex];

    await updateRoomDeckState(room, {
        playing: true,
        song: nextSong,
        currentSongIndex: newSongIndex,
        song_start_time: new Date()
    });

};


// Utils
const isSocketInDJQueue = (
    room: Room,
    user: User
) => {
    return room.dj_queue.findIndex(dj => dj.user._id.toString() === user._id.toString()) > -1
}

const isSocketDJ = (
    room: Room,
    user: User
) => {
    return room.on_deck.dj && room.on_deck.dj._id.toString() === user._id.toString();
}

const switchToNextDJ = async (
    room: Room
) => {

    // No one is in the queue?
    if (room.dj_queue.length === 0) {
        // Remove the current dj from the decks.
        return await clearTheDecks(room);
    }

    const nextDj = await UserModel.findOne({_id: room.dj_queue[0].user});
    const nextPlaylist = await PlaylistModel.findOne({ _id: room.dj_queue[0].playlist});
    const newSong = nextPlaylist!.songs[0];

    room.dj_queue.splice(0, 1);
    await (room as any).save();

    if (room.on_deck.dj) {
        socketServer.to(room.on_deck.dj._id.toString()).emit("no longer dj"); // Tell old DJ they're not IT anymore 
    }
    if (nextDj) {
        socketServer.to(nextDj._id.toString()).emit("became dj"); // Tell new DJ they're IT!
    }

    // TODO: Implement preventing of deleting of playlists when in a queue!

    await updateRoomDeckState(room, {
        playing: true,
        song: newSong,
        currentSongIndex: 0,
        song_start_time: new Date(),

        current_dj: nextDj?._id.toString() || undefined,
        playlist: nextPlaylist || undefined
    });

};

const clearTheDecks = async (
    room: Room
) => {

    if (!room.on_deck.playing) { return; }

    try {

        // Send a message to the current dj saying they're not the dj anymore
        socketServer.to(room.on_deck.dj!._id.toString()).emit("no longer dj");

        // Update the room
        await updateRoomDeckState(room, {
            playing: false,
            song: undefined,
            song_start_time: null,
            currentSongIndex: 0,
            current_dj: undefined,
            playlist: undefined
        });


    } catch (e) {
        console.error(e);
    }

};

const removeUserFromQueue = async (
    user: User,
    room: Room
) => {

    const queue = room.dj_queue;
    const userQueueIndex = queue.findIndex(dj => dj.user === user);
    queue.splice(userQueueIndex, 1);
    room.dj_queue = queue;
    await (room as any).save();

    return true;

};

const handleRoomDoesntExist = (
    roomId: string
) => {
    // Disconnect everyone in the room.
    socketServer.in(roomId).disconnectSockets();
}

const updateRoomDeckState = (
    room: Room,
    deckState: DeckState
): Promise<boolean> => {

    return new Promise(async (resolve) => {
        // Update the room
        room.on_deck.playing = deckState.playing;
        room.on_deck.song = deckState.song;
        room.on_deck.current_song_start_at = deckState.song_start_time !== null ? deckState.song_start_time : new Date();
        room.on_deck.current_song_index = deckState.currentSongIndex;

        if (deckState.current_dj !== undefined) {
            room.on_deck.dj = deckState.current_dj;
        }
        if (deckState.playlist !== undefined) {
            room.on_deck.playlist = deckState.playlist;
        }

        if(!room.on_deck.playing){
            room.on_deck.dj = undefined;
            room.on_deck.playlist = undefined;
        }
        
        await (room as any).save();

        // Alert all users in the room of the new change.
        socketServer.in((room as any).id).emit("deck change", {
            playing: deckState.playing,
            song: deckState.song,
            song_start_time: room.on_deck.current_song_start_at.getTime(),
            current_dj: room.on_deck.dj || null
        });

        resolve(true);
    });
}

const getUsersInRoom = (
    roomId: string
): { id: string, username:string }[] => {
    const usersInRoom = [];
    const clients = socketServer.sockets.adapter.rooms.get(roomId);
    for( const clientId of clients! ){
        const clientSocket = socketServer.sockets.sockets.get(clientId);
        usersInRoom.push({
            id: clientSocket?.data.profile.id,
            username: clientSocket?.data.profile.username
        })
    }

    return usersInRoom;
}