import { Router } from 'express';
import { body } from 'express-validator';
import { ValidateErrors } from '../middleware/validateErrors';
import { LocalSignIn, SignUp } from '../controllers/auth';
import { UserModel } from '../models/User';
import { isGuest } from '../middleware/isGuest';
export const AuthRouter = Router();

AuthRouter.post(
    "/signup",
    isGuest,
    body("username")
        .trim()
        .escape()
        .isString()
        .withMessage("Please enter a valid username")
        .isLength({min: 4, max: 50})
        .withMessage("Usernames must be at least 4 characters long but no longer than 50 characters.")
        .isAlphanumeric()
        .withMessage("Please enter a valid username")
        .custom((input: string) => {
            return new Promise(async (resolve, reject) => {
                try{
                    const user = await UserModel.findOne({ username: input });
                    if(!user){
                        resolve(true);
                    } else {
                        reject(new Error("This username has already been taken."))
                    }
                } catch (e) {
                    console.error(e);
                    reject(new Error("Failed to verify username status."))
                }
            });
        }),
    body("email")
        .trim()
        .escape()
        .isString()
        .withMessage("Please enter a valid email address")
        .isEmail()
        .withMessage("Please enter a valid email address")
        .custom((input: string) => {
            return new Promise(async (resolve, reject) => {
                try{
                    const user = await UserModel.findOne({ email: input });
                    if(!user){
                        resolve(true);
                    } else {
                        reject(new Error("You already have an account."))
                    }
                } catch (e) {
                    console.error(e);
                    reject(new Error("Failed to verify email status."))
                }
            })
        }),
    body("password")
        .isString()
        .withMessage("Please enter a valid password")
        .isStrongPassword({ 
            minLength: 8, 
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1
        })
        .withMessage("Your password must contain 1 uppercase, 1 lowercase and a number. It must also be at least 8 characters long."),
    ValidateErrors,
    SignUp
);

AuthRouter.post(
    "/login",
    isGuest,
    body("email")
        .isString()
        .withMessage("Please enter a valid email address")
        .isEmail()
        .withMessage("Please enter a valid email address")
        .trim(),
    body("password")
        .isString()
        .withMessage("Please enter a valid password")
        .isStrongPassword({ 
            minLength: 8, 
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1
        })
        .withMessage("Please enter a valid password."),
    ValidateErrors,
    LocalSignIn
);