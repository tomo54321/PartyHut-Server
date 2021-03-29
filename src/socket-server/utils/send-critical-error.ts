import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const sendCriticalError = (
    socket: Socket<DefaultEventsMap, DefaultEventsMap>,
    message: string,
    param: string = "server"
): Boolean => {
    socket.emit("critical error", ({
        errors: [{
            param,
            msg: message
        }]
    }));
    return true;
}