module.exports = {
    debug: true,
    server: {
        port: parseInt(process.env.SERVER_PORT),
    },
    client: {
        endpoint: process.env.CLIENT_ENDPOINT
    },
    translate: {
        qcloud: {
            secret_id: process.env.TRANSLATE_QCLOUD_SECRET_ID,
            secret_key: process.env.TRANSLATE_QCLOUD_SECRET_KEY
        }
    },
    repeat: {
        posibility_cap: parseFloat(process.env.REPEAT_POSITIBILITY_CAP || "0.3")
    }
}