import { Response, Request } from "express";
import { User } from "../database/entity/User";
import { Room } from "../database/entity/Room";

interface HomeRoom {
    id: string;
    name: string;
    thumbnail: string;
    host: {
        username: string;
    }
}
interface LayoutResponse {
    title: string;
    rooms: HomeRoom[];
}

export const GetRooms = async (req: Request, res: Response) => {

    try{
        
        let homeResponse: LayoutResponse[] = [];

        // If the user is logged in we'll send those rooms too.
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
                        thumbnail: getCurrentPlayingThumbnail(room),
                        host: {
                            username: (req.user! as User).username
                        }
                    }))
                })
            }
        }

        // Find new rooms
        const newRooms = await Room.find({
            take: 12,
            order: {
                createdAt: "DESC"
            },
            relations: ["owner"],
        });
        const recentRooms = await Promise.all( newRooms.map(async room => ({
            id: room.id,
            name: room.name,
            thumbnail: getCurrentPlayingThumbnail(room),
            host: {
                username: (await room.owner).username
            }
        })) );
        homeResponse.push({
            title: "New Rooms",
            rooms: recentRooms
        });

        // Find recently updated rooms
        const recentlyUpdated = await Room.find({
            take: 12,
            order: {
                updatedAt: "DESC"
            },
            relations: ["owner"],
        });
        const activeRooms = await Promise.all( recentlyUpdated.map(async room => ({
            id: room.id,
            name: room.name,
            thumbnail: getCurrentPlayingThumbnail(room),
            host: {
                username: (await room.owner).username
            }
        })) );
        
        homeResponse.push({
            title: "Active Rooms",
            rooms: activeRooms
        });

        // Send the layout to the client
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


const getCurrentPlayingThumbnail = (room: Room): string => {
    if(!room.is_playing){
        return "";
    }

    switch(room.current_playing_platform){
        case "SoundCloud":
            return "";
        case "YouTube":
            return `https://i.ytimg.com/vi/${room.current_playing_platform_id}/hqdefault.jpg`;
        default:
            return"";
    }
}