import { getModelForClass, prop } from "@typegoose/typegoose";

export class User {

    public _id: any;
    public id: any;

    @prop({ unique: true })
    public username: string;

    @prop({ unique: true })
    public email: string;

    @prop({ default: "http://placehold.it/75x75" })
    public avatar: string;

    @prop()
    public password: string;

    @prop({ default: Date.now() })
    public created_at: Date;

    @prop({ default: Date.now() })
    public updated_at: Date;
}

export const UserModel = getModelForClass(User);