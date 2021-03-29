import { Router } from 'express';
import { body } from 'express-validator';
import { CreateRoom } from '../controllers/room';
import { isAuth } from '../middleware/isAuth';
import { ValidateErrors } from '../middleware/validateErrors';
export const RoomRouter = Router();

RoomRouter.post(
    "/",
    body("name")
        .isString()
        .withMessage("Please enter a valid room name")
        .trim()
        .escape(),
    ValidateErrors,
    isAuth,
    CreateRoom
);
