import axios from 'axios';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { SongSearchResult } from 'src/@types/SongSearchResult';
import { SongResult } from 'src/@types/SongResult';
dayjs.extend(duration);

export const GetDataFromYouTube = (id: string): Promise<SongResult> => {

    return new Promise(async(resolve, reject) => {

        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${process.env.YOUTUBE_KEY}`;
        try {
            const { data } = await axios.get(url);
            resolve({
                title: data.items[0].snippet.title,
                artist: data.items[0].snippet.channelTitle,
                artwork: data.items[0].snippet.thumbnails.high.url,
                duration: dayjs.duration(data.items[0].contentDetails.duration).asSeconds()
            });
        } catch (e) {
            reject(e);
        }
    });

}


export const SearchYouTube = (query: string): Promise<SongSearchResult[]> => {

    return new Promise(async(resolve, reject) => {

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=50&q=${query}&key=${process.env.YOUTUBE_KEY}`;
        try {
            const { data } = await axios.get(url);
    
            resolve(
                data.items.map((song: any) => ({
                    id: song.id.videoId,
                    title: song.snippet.title,
                    artist: song.snippet.channelTitle,
                    platform: "YouTube",
                    artwork: song.snippet.thumbnails.high.url,
                    platform_id: song.id.videoId,
                }))
            );
        } catch {
            reject();
        }
    });

}