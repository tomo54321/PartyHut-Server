import { Response, Request } from "express";
import { Room } from "../database/entity/Room";

export const CreateRoom = async (req: Request, res: Response) => {

    try{

        const user_rooms_count = await Room.count({
            owner: req.user!
        });
        if(user_rooms_count > 0){
            return res.status(403).send({
                errors: [{
                    param: "roomLimit",
                    msg: "You already have a room, you cannot create another."
                }]
            })
        }

        const room = Room.create({
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