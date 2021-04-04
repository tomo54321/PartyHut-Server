require("dotenv").config();
import express from 'express';
import cors from 'cors';
import { AuthRouter } from './routes/auth';
import { InitStrategies } from './authentication/Strategies';
import passport from 'passport';
import { PlaylistRouter } from './routes/playlist';
import { ExternalRouter } from './routes/external';
import { RoomRouter } from './routes/room';
import { SessionMiddleware } from './middleware/session';

import { mongoose } from '@typegoose/typegoose';

(async () => {

    // Init App
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(SessionMiddleware);
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(cors({
        origin: ["http://localhost:3000", "http://192.168.68.134:3000"],
        credentials: true
    }));


    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL!, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log("Connected to MongoDB!");

    // Load available authentication strategies
    InitStrategies();

    app.use("/auth", AuthRouter);
    app.use("/playlist", PlaylistRouter);
    app.use("/room", RoomRouter);
    app.use("/external", ExternalRouter);

    // Start the socket server
    // require("./socket-server/index");

    // Listen
    const PORT = process.env.EXPRESS_PORT || 4000;
    app.listen(PORT, () => console.log(`Express listening on http://localhost:${PORT}`));
})();