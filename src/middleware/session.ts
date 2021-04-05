import session from "express-session";
import connectRedis from 'connect-redis';
import { redisClient } from "../modules/Redis";

const redisStore = connectRedis(session);



export const SessionMiddleware = session({
    store: new redisStore({
        client: redisClient,
    }),
    name: "sid",
    secret: process.env.SESSION_SECRET || "MYSECRETABC123",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7 * 365 // 7yrs
    }
});