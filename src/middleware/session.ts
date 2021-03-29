import session from "express-session";

export const SessionMiddleware = session({
    //store: redis
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