import axios from 'axios';
import { SongResult } from 'src/@types/SongResult';

export const GetDataFromSoundCloud = (id: string): Promise<SongResult> => {

    return new Promise(async(resolve, reject) => {

        const url = `https://api.soundcloud.com/tracks/${id}?client_id=${process.env.SOUNDCLOUD_CLIENT_ID}`;
        try {
            const { data } = await axios.get(url);
    
            resolve({
                title: data.title,
                artist: data.user.username,
                artwork: data.artwork_url,
                duration: data.duration / 1000
            });
        } catch (e) {
            reject(e);
        }
    });

}