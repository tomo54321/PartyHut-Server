import { Response, Request } from "express";
import { Room } from "../models/Room";

export const CreateRoom = async (req: Request, res: Response) => {

    try{

        const user_rooms = await Room.find({
            owner: req.user!
        });
        if(user_rooms.length > 0){
            return res.status(403).send({
                errors: [{
                    param: "roomLimit",
                    msg: "You already have a room, you cannot create another."
                }]
            })
        }

        const room = new Room({
            name: req.body.name,
            owner: req.user!
        });

        await room.save();

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