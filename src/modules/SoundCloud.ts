import axios from 'axios';
import { APISong } from 'src/@types/APISong';

export const GetDataFromSoundCloud = (id: string): Promise<APISong> => {

    return new Promise(async(resolve, reject) => {

        const url = `https://api.soundcloud.com/tracks/${id}?client_id=${process.env.SOUNDCLOUD_CLIENT_ID}`;
        try {
            const { data } = await axios.get(url);
    
            resolve({
                title: data.title,
                postedBy: data.user.username,
                thumbnailURL: data.artwork_url
            });
        } catch {
            reject();
        }
    });

}