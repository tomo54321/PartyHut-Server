import { hash } from "bcrypt";
import { Request, Response } from "express";
import passport from "passport";
import { User } from "../models/User";

export const SignUp = async (req: Request, res: Response) => {

    try {
        const password = await hash(req.body.password, 12);

        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password
        });

        await user.save();

        return res.send({ ok: true });

    } catch (e) {
        return res.status(500).send({
            errors: [
                {
                    param: "server",
                    msg: "Failed to create account, please try again."
                }
            ]
        })
    }

};

// The function that sends the ok login response from however they've logged in!
const OnSignIn = (user: any, _: Request, res: Response) => {

    return res.send({
        ok: true,
        user: {
            id: user.id,
            username: user.username,
            createdAt: user.createdAt
        }
    })

};

export const LocalSignIn = (req: Request, res: Response) => {

    passport.authenticate("local", (err, user, info) => {
        if (err) {
            return res.status(500).send({
                errors: [{
                    param: "server",
                    msg: info.message || "Failed to verify email or password."
                }]
            })
        }

        if (!user) {
            return res.status(400).send({
                errors: [{
                    param: "email",
                    msg: info.message || "Failed to verify email or password."
                }]
            })
        }

        return req.logIn(user, (err) => {

            if (err) {
                console.error(err);
                return res.status(400).send({
                    errors: [{
                        param: "email",
                        msg: "Failed to verify email or password."
                    }]
                })
            }

            return OnSignIn(user, req, res);
        });
    })(req, res);

};