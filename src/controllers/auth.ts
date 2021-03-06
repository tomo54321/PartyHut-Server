import { hash } from "bcrypt";
import { Request, Response } from "express";
import passport from "passport";
import { RoomModel } from "../models/Room";
import { User, UserModel } from "../models/User";

export const SignUp = async (req: Request, res: Response) => {

    try {
        const password = await hash(req.body.password, 12);

        await UserModel.create({
            username: req.body.username,
            email: req.body.email,
            password
        });

        return res.send({ ok: true });

    } catch (e) {
        console.log(e);
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
const OnSignIn = async (user: User, _: Request, res: Response) => {

    const rooms = await RoomModel.find({
        owner: user
    }).limit(10).exec();

    return res.send({
        ok: true,
        user: {
            id: (user as any).id,
            username: user.username,
            avatar: user.avatar,
            huts: rooms.map((room) => ({
                id: room._id,
                name: room.name
            })),
            created_at: user.created_at
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

export const GetUser = async (req: Request, res: Response) => {
    const user = req.user! as User;
    const rooms = await RoomModel.find({
        owner: user
    }).limit(10).exec();

    return res.send({
        ok: true,
        user: {
            id: (user as any).id,
            username: user.username,
            avatar: user.avatar,
            huts: rooms.map((room) => ({
                id: room._id,
                name: room.name
            })),
            created_at: user.created_at
        }
    })
};