import { Router } from 'express';
import { body } from 'express-validator';
import { ValidateErrors } from '../middleware/validateErrors';
import { isAuth } from '../middleware/isAuth';
import { MyAccount, UpdateAccount } from '../controllers/account';
import { UserModel } from '../models/User';
import { compare } from 'bcrypt';
export const AccountRouter = Router();

AccountRouter.get(
    "/",
    isAuth,
    MyAccount
);

AccountRouter.put(
    "/",
    isAuth,
    body("username")
        .trim()
        .escape()
        .isString()
        .toLowerCase()
        .withMessage("Please enter a valid username")
        .isLength({ min: 4, max: 50 })
        .withMessage("Usernames must be at least 4 characters long but no longer than 50 characters.")
        .isAlphanumeric()
        .withMessage("Please enter a valid username")
        .custom((input: string, { req }) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const user = await UserModel.findOne({ username: input });
                    if (!user || user.id === req.user.id) {
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
        .toLowerCase()
        .withMessage("Please enter a valid email address")
        .isEmail()
        .withMessage("Please enter a valid email address")
        .custom((input: string, { req }) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const user = await UserModel.findOne({ email: input });
                    if (!user || req.user.id === user.id) {
                        resolve(true);
                    } else {
                        reject(new Error("You already have an account with this email address."))
                    }
                } catch (e) {
                    console.error(e);
                    reject(new Error("Failed to verify email status."))
                }
            })
        }),
    ValidateErrors,
    UpdateAccount
);

AccountRouter.delete(
    "/",
    isAuth,
    body("password")
        .isString()
        .withMessage("Please enter a valid password")
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1
        })
        .withMessage("Please enter a valid password.")
        .custom((input: string, { req }) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const passwordValid = await compare(input, req.user.password);
                    if(!passwordValid){
                        reject(new Error("Your password is incorrect."))
                    }

                    resolve(true);
                } catch (e) {
                    console.error(e);
                    reject(new Error("Failed to check your password."))
                }
            });
        }),
)