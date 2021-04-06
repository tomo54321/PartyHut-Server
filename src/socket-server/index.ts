require("dotenv").config();
import { Server } from 'socket.io';
import { createServer } from 'http';
import { onSocketConnected } from './controllers/core';
import { SessionMiddleware } from '../middleware/session';
import { isAuth } from './middleware/authentication';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
export let socketServer: Server<DefaultEventsMap, DefaultEventsMap>;

(async () => {
    const BreakException = {};
    // Setup the socket server
    const server = createServer();
    const io = new Server(server, {
        path: "/",
        serveClient: false,
        cors: {
            origin: ["http://localhost:3000", "http://192.168.68.134:3000", "http://local.partyhut.net:3000"],
        },
        transports: ["websocket"]
    });

    socketServer = io;


    // Setup socketio to use express session
    io.use((socket, next) => {
        SessionMiddleware(socket.request as any, {} as any, next as any);
    });

    // Verify user's logged in.
    io.use(async (socket, next) => {
        try{
            const status = await isAuth(socket);
            if(!status){
                socket.disconnect();
                return;
            }
            next();
        } catch {
            socket.disconnect();
            return;
        }
    });

    // Verify user isn't already connected to the socket server
    io.use((socket, next) => {
        const allSockets = io.sockets.sockets;
        let wasFound = false;
        try{
            allSockets.forEach(client => {
                if(client.data.profile._id === socket.data.profile._id){
                    wasFound = true;
                    throw BreakException;
                }
            });
            // Assume all is good and user isn't connected elsewhere.
            if(!wasFound){

                // Join a private room of the sockets profile id.
                socket.join(socket.data.profile._id.toString());

                next();
            } else {
                socket.disconnect();
            }

        } catch (e) {
            socket.disconnect();
        }
    });

    io.on("connection", onSocketConnected);


    const PORT = process.env.SOCKET_PORT || 4001;
    server.listen(PORT, () => console.log(`Sockets started on http://localhost:${PORT}`));
})();