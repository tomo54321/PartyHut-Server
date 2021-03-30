import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { Playlist } from "../../database/entity/Playlist";
import { Room } from "../../database/entity/Room";
import { User } from "../../database/entity/User";
import { socketServer } from "..";
import { DeckState } from "../@types/DeckState";
import { sendCriticalError } from "../utils/send-critical-error";
import { sendError } from "../utils/send-error";

export const roomHandlers = (socket: Socket<DefaultEventsMap, DefaultEventsMap>) => {

    /**
     * Socket join room event
     */
    socket.on("join room", async ({ id }: { id: string }) => {
        try {
            const room = await Room.findOne(id);
            if (!room) {
                sendCriticalError(socket, "Room doesn't exist.", "server");
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

        try {
            // Fetch the current room.
            const room = await Room.findOne(socket.data.currentRoom);
            if (!room) {
                return handleRoomDoesntExist(socket.data.currentRoom);
            }
            // Fetch the current user
            const user: User = socket.data.profile;
            // Fetch the playlist to join with.
            const playlist = await Playlist.findOne({
                where: {
                    id: playlistId,
                    owner: user
                }
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
            const room = await Room.findOne(socket.data.currentRoom);
            if (!room) {
                console.log("ROOM NEIN FOUND!");
                return handleRoomDoesntExist(socket.data.currentRoom);
            }
            const user = socket.data.profile;

            if (isSocketDJ(room, user) && room.is_playing) {

                // Song has been going longer than 10 seconds?
                if (room.current_song_started_at!.getTime() < (Date.now() - 10000)) {
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
    socket.data.currentRoom = room.id;

    // Join the room in socket.io
    socket.join(room.id);

    // Let other users know someone joined!
    socket.to(room.id).emit("user join", {
        id: socket.data.profile.id,
        username: socket.data.profile.username
    });

    // Fetch the rooms owner
    const owner = await room.owner;

    // Send the joined response to the user
    socket.emit("joined room", {
        id: room.id,
        name: room.name,
        host: {
            id: owner.id,
            username: owner.username
        },
        on_deck: {
            playing: room.is_playing,
            platform: room.current_playing_platform,
            platformId: room.current_playing_platform_id,
            songStartedAt: room.current_song_started_at,

            current_dj: room.current_dj?.id || null
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
        const room = await Room.findOne(roomId);
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

    room.current_dj_queue.push({
        userId: user.id,
        playlistId: playlist.id
    });

    // If this is the only user in the queue.
    if (room.is_playing === false) {
        return switchToNextDJ(room);
    }

    // Otherwise add to the queue.
    await room.save();

    return socketServer.to(user.id).emit("joined queue");

};

const onSocketSkipSong = async (
    room: Room
) => {

    const playlist = room.current_playlist!;
    if (room.current_song_index === (playlist.songs.length - 1)) {
        console.log("Going to next DJ");
        return switchToNextDJ(room);
    }

    const newSongIndex = room.current_song_index! + 1;
    const nextSong = playlist.songs[newSongIndex];

    await updateRoomDeckState(room, {
        playing: true,
        platform: nextSong.platform,
        platformId: nextSong.platformId,
        currentSongIndex: newSongIndex,
        songStartedAt: new Date()
    });

};


// Utils
const isSocketInDJQueue = (
    room: Room,
    user: User
) => {
    return room.current_dj_queue.findIndex(dj => dj.userId === user.id) > -1
}

const isSocketDJ = (
    room: Room,
    user: User
) => {
    return room.current_dj !== null && room.current_dj.id === user.id;
}

const switchToNextDJ = async (
    room: Room
) => {

    // No one is in the queue?
    if (room.current_dj_queue.length === 0) {
        // Remove the current dj from the decks.
        return await clearTheDecks(room);
    }

    const nextDj = await User.findOne(room.current_dj_queue[0].userId);
    const nextPlaylist = await Playlist.findOne(room.current_dj_queue[0].playlistId);
    const newSong = nextPlaylist!.songs[0];

    room.current_dj_queue.splice(0, 1);
    await room.save();

    if (room.current_dj) {
        socketServer.to(room.current_dj.id).emit("no longer dj"); // Tell old DJ they're not IT anymore 
    }
    if (nextDj) {
        socketServer.to(nextDj.id).emit("became dj"); // Tell new DJ they're IT!
    }

    // TODO: Implement preventing of deleting of playlists when in a queue!

    await updateRoomDeckState(room, {
        playing: true,
        platform: newSong.platform,
        platformId: newSong.platformId,
        currentSongIndex: 0,
        songStartedAt: new Date(),

        current_dj: nextDj,
        playlist: nextPlaylist
    });

};

const clearTheDecks = async (
    room: Room
) => {

    if (!room.is_playing) { return; }

    try {

        // Send a message to the current dj saying they're not the dj anymore
        socketServer.to(room.current_dj!.id).emit("no longer dj");

        // Update the room
        await updateRoomDeckState(room, {
            playing: false,
            platform: null,
            platformId: null,
            songStartedAt: null,
            currentSongIndex: 0,
            current_dj: null,
            playlist: null
        });


    } catch (e) {
        console.error(e);
    }

};

const removeUserFromQueue = async (
    user: User,
    room: Room
) => {

    const queue = room.current_dj_queue;
    const userQueueIndex = queue.findIndex(dj => dj.userId === user.id);
    queue.splice(userQueueIndex, 1);
    room.current_dj_queue = queue;
    await room.save();

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
        room.is_playing = deckState.playing;
        room.current_playing_platform = deckState.platform;
        room.current_playing_platform_id = deckState.platformId;
        room.current_song_started_at = deckState.songStartedAt;
        room.current_song_index = deckState.currentSongIndex;

        if (deckState.current_dj !== undefined) {
            room.current_dj = deckState.current_dj;
        }
        if (deckState.playlist !== undefined) {
            room.current_playlist = deckState.playlist;
        }
        await room.save();

        // Alert all users in the room of the new change.
        socketServer.in(room.id).emit("deck change", {
            playing: deckState.playing,
            platform: deckState.platform,
            platformId: deckState.platformId,
            songStartedAt: deckState.songStartedAt?.getTime() || null,
            current_dj: deckState.current_dj?.id || null
        });

        resolve(true);
    });
}