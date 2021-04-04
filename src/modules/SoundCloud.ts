import axios from 'axios';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { SongResult } from 'src/@types/SongResult';
dayjs.extend(duration);

export const GetDataFromSoundCloud = (id: string): Promise<SongResult> => {

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