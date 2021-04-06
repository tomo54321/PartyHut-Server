import { Response, Request } from "express";
import { RoomModel } from "../models/Room";

export const GetRooms = async (req: Request, res: Response) => {

    try {

        let roomQuery = RoomModel.find({})
            .sort({ 'created_at': - 1 })
            .limit(20);
        
        if(req.query.category === "search" && req.query.query){
            roomQuery.where({
                name: {
                    $regex: req.query.query,
                    $options: "i"
                }
            })
        }

        const rooms = await roomQuery.exec();

        // Send the layout to the client
        return res.send({
            ok: true,
            rooms: rooms.map((room) => ({
                id: room.id,
                name: room.name,
                genres: room.genres,
                playing: room.on_deck.playing,
                song: {
                    title: room.on_deck.song?.title,
                    artwork: room.on_deck.song?.artwork
                }
            }))
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

        const user_rooms_count = await RoomModel.countDocuments({
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
            owner: req.user!,
            on_deck: {
                playing: false
            }
        });

        return res.send({
            ok: true,
            room: {
                id: room.id,
                name: room.name
            }
        })
    } catch (e) {
        console.log(e);
        return res.status(500).send({
            errors: [{
                param: "server",
                msg: "Failed to create room, please try again."
            }]
        })
    }

};
