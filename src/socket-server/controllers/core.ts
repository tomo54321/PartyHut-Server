import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { roomHandlers } from "./room";

export const onSocketConnected = (socket: Socket<DefaultEventsMap, DefaultEventsMap>) => {
    console.log(`Socket with username of ${socket.data.profile.username} connected!`);

    // Register Room Events
    roomHandlers(socket);
    

    /**
    * Handle socket getting disconnected.
    */
    socket.on("disconnect", () => {
        console.log(`${socket.data.profile.username} disconnected`);
    });

};