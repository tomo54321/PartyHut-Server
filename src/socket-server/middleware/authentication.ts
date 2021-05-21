import { isValidObjectId } from "mongoose";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { UserModel } from "../../models/User";

export const hasUser = (socket: Socket<DefaultEventsMap, DefaultEventsMap>) => {
    return (socket.request as any).session.passport !== undefined && (socket.request as any).session.passport.user !== undefined;
};

export const isAuth = async (socket: Socket<DefaultEventsMap, DefaultEventsMap>): Promise<Boolean> => {
    if (!hasUser(socket) || !isValidObjectId((socket.request as any).session.passport.user)) {
        return false;
    }

    try {
        const user = await UserModel.findOne({
            _id: (socket.request as any).session.passport.user
        });
        if (!user) {
            return false;
        }
        socket.data.profile = user;
        return true;
    } catch (e) {
        return false;
    }


}