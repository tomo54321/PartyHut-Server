import axios from 'axios';
import { APISong } from 'src/@types/APISong';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

export const GetDataFromSoundCloud = (id: string): Promise<APISong> => {

    return new Promise(async(resolve, reject) => {

        const url = `https://api.soundcloud.com/tracks/${id}?client_id=${process.env.SOUNDCLOUD_CLIENT_ID}`;
        try {
            const { data } = await axios.get(url);
    
            resolve({
                title: data.title,
                artist: data.user.username,
                artwork: data.artwork_url,
                duration: dayjs.duration(data.items[0].contentDetails.duration).asSeconds()
            });
        } catch {
            reject();
        }
    });

}