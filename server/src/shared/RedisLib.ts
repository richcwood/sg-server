import * as redisAsync from 'async-redis';
import * as redis from 'redis';
import * as config from 'config';

let num_connections: number = 0;

export class RedisLib {
    private redisAsyncClient: any;
    private redisClient: any;
    constructor() {
        this.redisAsyncClient = redisAsync.createClient(process.env.redisUrl);
        this.redisClient = redis.createClient(process.env.redisUrl);

        num_connections++;
        console.log(`${num_connections} redis connections`);

        this.redisAsyncClient.on('error', function (err) {
            console.log('Error ' + err);
        });
    }

    dispose() {
        this.redisClient.quit();
        this.redisAsyncClient.quit();
    }

    async Get(key) {
        return await this.redisAsyncClient.get(key);
    }

    async Del(key) {
        return await this.redisAsyncClient.del(key);
    }

    async DelHashValue(hash, key) {
        return await this.redisAsyncClient.hdel(hash, key);
    }

    async GetOrCreateAtomic(key, defaultVal) {
        let redis_cmd =
            "redis.replicate_commands(); local proc = redis.call('get', KEYS[1]); if proc then return proc; else redis.call('set', KEYS[1], ARGV[1]); return nil; end;";
        return await this.redisAsyncClient.eval(redis_cmd, 1, key, defaultVal);
    }

    async GetOrCreateHashValueAtomic(hash, key, defaultVal) {
        let redis_cmd =
            "redis.replicate_commands(); local proc = redis.call('hget', KEYS[1], ARGV[1]); if proc then return proc; else redis.call('hset', KEYS[1], ARGV[1], ARGV[2]); return nil; end;";
        return await this.redisAsyncClient.eval(redis_cmd, 1, hash, key, defaultVal);
    }

    async IncrementValIfEqualsAtomic(key, expectedVal, newVal) {
        let redis_cmd =
            "redis.replicate_commands(); local proc = redis.call('get', KEYS[1]); if proc == ARGV[1] then redis.call('set', KEYS[1], ARGV[2]); end; return proc;";
        return await this.redisAsyncClient.eval(redis_cmd, 1, key, expectedVal, newVal);
    }

    async SetHashValIfEqualsAtomic(hash, key, expectedVal, newVal) {
        let redis_cmd =
            "redis.replicate_commands(); local proc = redis.call('hget', KEYS[1], ARGV[1]); if proc == ARGV[2] then redis.call('hset', KEYS[1], ARGV[1], ARGV[3]); end; return proc;";
        return await this.redisAsyncClient.eval(redis_cmd, 1, hash, key, expectedVal, newVal);
    }

    async SetKey(key, val) {
        return await this.redisAsyncClient.set(key, val);
    }

    async SetHashValue(hash, key, val) {
        return await this.redisAsyncClient.hset([hash, key, val]);
    }

    async SetHashValues(hash, values) {
        let arr: string[] = [];
        Object.keys(values).forEach((key) => {
            arr.push(key);
            arr.push(values[key]);
        });
        return await this.redisAsyncClient.hset(hash, arr);
    }

    async GetHashValue(hash, key) {
        return await this.redisAsyncClient.hget(hash, key);
    }

    async GetHashValues(hash) {
        return await this.redisAsyncClient.hgetall(hash);
    }

    async AddMemberToSet(set: string, member: string) {
        return await this.redisAsyncClient.sadd(set, member);
    }

    async RemoveMemberFromSet(set: string, member: string) {
        return await this.redisAsyncClient.srem(set, member);
    }

    async IsMemberOfSet(set: string, member: string) {
        return await this.redisAsyncClient.sismember(set, member);
    }

    async GetMembers(set: string) {
        return await this.redisAsyncClient.smembers(set);
    }

    async SetKeyTTL(key, ttl) {
        return await this.redisAsyncClient.expire(key, ttl);
    }

    async SetKeysAtomic(keyValuePairs) {
        return new Promise((resolve, reject) => {
            let multi = this.redisClient.multi();
            Object.keys(keyValuePairs).forEach((key) => {
                multi.set(key, keyValuePairs[key]);
            });
            multi.exec((err, replies) => {
                if (err) reject(err);
                else resolve(replies);
            });
        });
    }
}
