import passport from "passport";
import { UserModel } from "../models/User";
import { InitLocalAuthStrategy } from "./Local";

export const InitStrategies = () => {
    InitLocalAuthStrategy();

    passport.serializeUser((user: any, done) => {
        done(null, (user).id);
    });

    passport.deserializeUser(async (id, done) => {
        try{
            const user = await UserModel.findOne({
                where: {
                    id: id
                }
            });
            if(!user){
                return done(new Error("User not found"));
            }
            return done(null, user);
        } catch (e) {
            return done(e);
        }
    })
};