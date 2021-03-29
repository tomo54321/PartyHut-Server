import axios from 'axios';
import { APISong } from 'src/@types/APISong';

export const GetDataFromYouTube = (id: string): Promise<APISong> => {

    return new Promise(async(resolve, reject) => {

        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${process.env.YOUTUBE_KEY}`;
        try {
            const { data } = await axios.get(url);
    
            resolve({
                title: data.items[0].snippet.title,
                postedBy: data.items[0].snippet.channelTitle,
                thumbnailURL: data.items[0].snippet.thumbnails.high.url
            });
        } catch {
            reject();
        }
    });

}


export const SearchYouTube = (query: string): Promise<APISong[]> => {

    return new Promise(async(resolve, reject) => {

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=50&q=${query}&key=${process.env.YOUTUBE_KEY}`;
        try {
            const { data } = await axios.get(url);
    
            resolve(
                data.items.map((song: any) => ({
                    id: song.id.videoId,
                    title: song.snippet.title,
                    postedBy: song.snippet.channelTitle,
                    platform: "YouTube",
                    thumbnailUrl: song.snippet.thumbnails.high.url,
                    platformId: song.id.videoId,
                }))
            );
        } catch {
            reject();
        }
    });

}