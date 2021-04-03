import { getModelForClass, prop } from "@typegoose/typegoose";

export class User {
    @prop({ unique: true })
    public username: string;

    @prop({ unique: true })
    public email: string;

    @prop()
    public password: string;

    @prop({ default: () => "CURRENT_TIMESTAMP" })
    public created_at: Date;

    @prop({ default: () => "CURRENT_TIMESTAMP" })
    public updated_at: Date;
}

export const UserModal = getModelForClass(User);