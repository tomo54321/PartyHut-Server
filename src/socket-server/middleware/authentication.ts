import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { User } from "../../models/User";

export const hasUser = (socket: Socket<DefaultEventsMap, DefaultEventsMap>) => {
    return (socket.request as any).session.passport !== undefined && (socket.request as any).session.passport.user !== undefined;
};

export const isAuth = async (socket: Socket<DefaultEventsMap, DefaultEventsMap>): Promise<Boolean> => {
    if(!hasUser(socket)){
        return false;
    }

    try{
        const user = await User.findById((socket.request as any).session.passport.user);
        if(!user){
            return false;
        }
        socket.data.profile = user;
        return true;
    } catch {
        return false;
    }


}