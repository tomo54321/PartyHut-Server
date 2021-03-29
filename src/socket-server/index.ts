require("dotenv").config();
import { Server } from 'socket.io';
import { createServer } from 'http';
import mongoose from 'mongoose';
import LoadModels from '../models/LoadModels';
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
            origin: ["http://localhost:3000", "http://192.168.68.134:3000"],
        },
        transports: ["websocket"]
    });

    socketServer = io;

    // Connect to MongoDB
    try {
        await mongoose.connect(process.env.MONGO_URL!, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Connected to MongoDB!");
    } catch (e) {
        console.error("FAILED TO CONNECT TO MONGODB");
        console.error(e);
        process.exit();
    }
    // Load the mongoose models
    const _ = LoadModels;
    console.log(`Loaded ${Object.keys(_).length} models!`);

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
                if(client.data.profile._id.toString() === socket.data.profile._id.toString()){
                    wasFound = true;
                    throw BreakException;
                }
            });
            // Assume all is good and use isn't connected.
            if(!wasFound){
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