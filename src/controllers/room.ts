import { Response, Request } from "express";
import { User } from "src/database/entity/User";
import { Room } from "../database/entity/Room";

export const GetRooms = async (req: Request, res: Response) => {

    try{
        let homeResponse = [];

        if(req.user){
            const myRooms = await Room.find({
                where: {
                    owner: req.user as User
                }
            });
            if(myRooms.length > 0){
                homeResponse.push({
                    title: "My Rooms",
                    rooms: myRooms.map(room => ({
                        id: room.id,
                        name: room.name,
                        host: {
                            username: (req.user! as User).username
                        }
                    }))
                })
            }
        }


        const newRooms = await Room.find({
            relations: ["owner"],
            take: 12,
            order: {
                createdAt: "DESC"
            }
        });
        homeResponse.push({
            title: "New Rooms",
            rooms: newRooms.map(room => ({
                id: room.id,
                name: room.name,
                host: {
                    username: (room.owner as any).username
                }
            }))
        });

        const recentlyUpdated = await Room.find({
            relations: ["owner"],
            take: 12,
            order: {
                updatedAt: "DESC"
            }
        });
        homeResponse.push({
            title: "Active Rooms",
            rooms: recentlyUpdated.map(room => ({
                id: room.id,
                name: room.name,
                host: {
                    username: (room.owner as any).username
                }
            }))
        });

        return res.send({
            ok: true,
            layout: homeResponse
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