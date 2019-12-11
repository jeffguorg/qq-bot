const redis = require("redis");
const config = require("./config");

module.exports = redis.createClient(config.cache.url, {
    db: config.db,
})