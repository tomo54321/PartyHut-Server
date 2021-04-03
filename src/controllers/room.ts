import { Response, Request } from "express";
import { RoomModel } from "../models/Room";

export const GetRooms = async (_: Request, res: Response) => {

    try {

        const rooms = await RoomModel.find({})
            .sort({ 'created_at': - 1 })
            .limit(20)
            .exec();

        // Send the layout to the client
        return res.send({
            ok: true,
            rooms
        })

    } catch (e) {
        console.error(e);
        return res.status(500).send({
            errors: [{
                param: "server",
                msg: "Failed to fetch rooms, please try again."
            }]
        })
    }

};

export const CreateRoom = async (req: Request, res: Response) => {

    try {

        const user_rooms_count = await RoomModel.count({
            owner: req.user!
        });
        if (user_rooms_count > 0) {
            return res.status(403).send({
                errors: [{
                    param: "roomLimit",
                    msg: "You already have a room, you cannot create another."
                }]
            })
        }

        const room = await RoomModel.create({
            name: req.body.name,
            owner: req.user!
        });

        return res.send({
            ok: true,
            room: {
                id: room.id,
                name: room.name
            }
        })
    } catch (e) {
        return res.status(500).send({
            errors: [{
                param: "server",
                msg: "Failed to create room, please try again."
            }]
        })
    }

};
