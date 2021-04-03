import passport from "passport";
import {Strategy} from 'passport-local';
import { UserModel } from "../models/User";
import { compare } from 'bcrypt';

export const InitLocalAuthStrategy = () => {
    passport.use(GetStrategy());
}

const GetStrategy = (): Strategy => {
    return new Strategy(
        {
            usernameField: "email",
            passwordField: "password"
        },
        async (email, password, done) => {
        try{
            const user = await UserModel.findOne({ email });
            if(!user){
                return done(null, false, { message: 'Invalid email or password.' });
            }
            const passVerify = await compare(password, user.password);
            if(!passVerify){                
                return done(null, false, { message: 'Invalid email or password.' });
            }

            return done(null, user);
        } catch (e) {
            console.error(e);
            return done(null, false, { message: "Failed to verify email and password, please try again." });
        }
    })
};