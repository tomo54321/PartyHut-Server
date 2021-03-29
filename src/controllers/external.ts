import { Request, Response } from 'express';
import { SearchYouTube as SearchYouTubeAPI } from '../modules/YouTube';

export const SearchYouTube = async (req: Request, res: Response) => {

    try{

        const songs = await SearchYouTubeAPI((req.query as any).query!);
        return res.send({
            ok: true,
            songs
        })

    } catch (e) {
        return res.status(500).send({
            errors:[{
                param: "server",
                msg: "Failed to connect to YouTube, please try again later."
            }]
        })
    }

};