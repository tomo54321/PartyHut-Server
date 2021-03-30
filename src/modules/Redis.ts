import redis from 'redis';
import { promisify } from 'util';
export const redisClient = redis.createClient({
    host: process.env.REDIS_ENDPOINT,
    port: parseInt(process.env.REDIS_PORT!),
    password: process.env.REDIS_PASSWORD,
    // db: process.env.REDIS_DB
});

export const redisGet = promisify(redisClient.get);
export const redisSetEx = promisify(redisClient.setex);
export const redisSet = promisify(redisClient.set);
export const redisDelete = promisify(redisClient.del)