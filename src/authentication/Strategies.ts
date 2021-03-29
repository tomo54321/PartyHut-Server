import passport from "passport";
import { User } from "../models/User";
import { InitLocalAuthStrategy } from "./Local";

export const InitStrategies = () => {
    InitLocalAuthStrategy();

    passport.serializeUser((user: any, done) => {
        done(null, (user).id);
    });

    passport.deserializeUser(async (id, done) => {
        try{
            const user = await User.findById(id);
            if(!user){
                return done(new Error("User not found"));
            }
            return done(null, user);
        } catch (e) {
            return done(e);
        }
    })
};