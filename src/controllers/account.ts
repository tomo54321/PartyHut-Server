import { Request, Response } from "express";
import { PlaylistModel } from "../models/Playlist";
import { RoomModel } from "../models/Room";
import { User, UserModel } from "../models/User";

export const MyAccount = (req: Request, res: Response) => {

    const user = req.user as User;

    return res.send({
        ok: true,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            created_at: user.created_at,
            updated_at: user.updated_at
        }
    })
};

export const UpdateAccount = async (req: Request, res: Response) => {

    const user = req.user as User;

    try {

        user.username = req.body.username;
        user.email = req.body.email;
        await (user as any).save();
        
        return res.send({
            ok: true,
            user: {
                username: user.username,
                email: user.email
            }
        })

    } catch (e) {
        return res.status(500).send({
            errors: [{
                param: "server",
                msg: "Failed to update account"
            }]
        })
    }

};

export const DeleteAccount = async (req: Request, res: Response) => {

    try {

        await PlaylistModel.deleteMany({
            owner: req.user
        });

        await RoomModel.deleteMany({
            owner: req.user
        });

        await UserModel.deleteOne({ id: (req.user! as User).id });

        return req.session.destroy(() => {
            return res.send({ ok: true });
        });

    } catch (e) {
        return res.status(500).send({
            errors: [{
                param: "server",
                msg: "Failed to delete account."
            }]
        })
    }

};