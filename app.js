const WebSocket = require('ws');
const CQClient = require("./cqc");
const config = require("./config")

const handlers = require("./handlers")
const shellquote = require("shell-quote")

const wss = new WebSocket.Server({ port: config.server.port });

new handlers.AtHandler();
new handlers.CatHandler("cat");
new handlers.JoinHandler()
new handlers.KeywordResponder();
new handlers.LeaveHandler()
new handlers.PingHandler();
new handlers.RepeatHandler("repeat");
new handlers.ShortHandler("s");
new handlers.TranslateHandler("translate");

global.debug = true;
global.echo = true;

console.log("starting server")

wss.on('connection', function connection(ws, req) {
    console.log("accepting connection")
    const cqc = new CQClient(config.client.endpoint);
    const path = req.url;
    var repeat = {};
    if (path == "/api") {
        ws.on('message', function incoming(message) {
            console.log('api received: %s', JSON.parse(message));
        });
    } else if (path == "/event") {
        ws.on('message', function incoming(message) { // when messages arrive
            message = JSON.parse(message)
            switch (message["post_type"]) {
                case "message":
                    if (/^\+/.test(message['message'])) {
                        var rawcmd = message['message'].slice(1)
                        var body = null;

                        multiline = false;

                        if (rawcmd.indexOf("\n") >= 0) {
                            multiline = true;
                            body = rawcmd.split("\n").slice(1)
                            rawcmd = rawcmd.split("\n")[0]
                        }

                        rawcmd = rawcmd.replace(/\[CQ:at,qq=(\d+)\]/, (match, qq) => {
                            return "| at " + qq
                        })

                        rawcmd = rawcmd.split("|")
                        var last_res = null;
                        for (var i = 0; i < rawcmd.length; i++) {
                            var arguments = shellquote.parse(rawcmd[i])
                            var cmd = arguments[0]
                            var args = []
                            var kwargs = {}
                            for (var ai = 1; ai < arguments.length; ai++) {
                                if (arguments[ai].indexOf('=') >= 0) {
                                    kv = arguments[ai].split("=")
                                    kwargs[kv[0]] = kv[1]
                                } else {
                                    args.push(arguments[ai])
                                }
                            }

                            if (global.handlers[cmd] != null) {
                                last_res = global.handlers[cmd].handle(cqc, message, cmd, args, kwargs, last_res, body);
                                if(!(last_res instanceof Array)) {
                                    last_res = [{
                                        "type": "text",
                                        "data": {
                                            "text": last_res
                                        }
                                    },]
                                }
                            } else {
                                cqc.privmsg(message['user_id'], "[CQ:shake]")
                                cqc.privmsg(message['user_id'], "Command " + cmd + " no handler found")
                                break;
                            }
                        }
                        if (last_res != null && last_res.length > 0 && i == rawcmd.length) {
                            if (message['message_type'] == 'private')
                                cqc.privmsg(message['user_id'], last_res)
                            else if (message['message_type'] == 'group')
                                cqc.groupmsg(message['group_id'], last_res)
                        }
                    } else {
                        for (var i = 0; i < (global.pipes || []).length; i++) {
                            var pipe = global.pipes[i];
                            var res = pipe.pipe(cqc, message);
                            if (res && (res.block == true)) {
                                break;
                            }
                        }
                    } // post_type == message
                    break;
                case "request":
                    switch(message["request_type"]){
                        case "group":
                            switch(message["sub_type"]){
                                case "invite":
                                    cqc.privmsg(config.admin[0], [{
                                        "type": "text",
                                        "data": {
                                            "text": `User ${message["user_id"]} invite bot to join ${message["group_id"]}. flag=${message["flag"]}`
                                        }
                                    }])
                                    break;
                                case "add":
                                    cqc.privmsg(config.admin[0], [{
                                        "type": "text",
                                        "data": {
                                            "text": `User ${message["user_id"]} wants to join ${message["group_id"]}. flag=${message["flag"]}`
                                        }
                                    }])
                            }
                            break;
                        case "friend":
                            cqc.privmsg(config.admin[0], [{
                                "type": "text",
                                "data": {
                                    "text": `User ${message["user_id"]} wants to add bot for '${message["comment"]}'. flag=${message["flag"]}`
                                }
                            }])
                            break;
                    }
                    break
            }
        });
        cqc.on("open", () => {
            cqc.ping()
        })
        cqc.on("pong", () => {
            cqc.privmsg(config.admin[0], [{
                "type": "text",
                "data": {
                    "text": "pong"
                }
            }]);
        })
    }
});
