const WebSocket = require('ws');
const CQClient = require("./cqc");
const config = require("./config")

const handlers = require("./handlers")
const shellquote = require("shell-quote")

const wss = new WebSocket.Server({ port: 8080 });

new handlers.RepeatHandler("repeat");
new handlers.CatHandler("cat");
new handlers.KeywordResponder();
new handlers.AtHandler();
new handlers.ShortHandler("s");
new handlers.TranslateHandler("translate");

global.debug = true;
global.echo = true;

console.log("starting server")

wss.on('connection', function connection(ws,req) {
    console.log("accepting connection")
    const cqc = new CQClient(config.client.endpoint);
    const path = req.url;
    var repeat = {};
    if(path == "/api") {
        ws.on('message', function incoming(message) {
            console.log('api received: %s', JSON.parse(message));
        });
    }else if (path == "/event") {
        ws.on('message', function incoming(message) { // when messages arrive
            message = JSON.parse(message)

            function handleGroupMessage(msg) {
                if(/^\+/.test(msg['message'])) {
                    var rawcmd = msg['message'].slice(1)
                    var body = null;
                    
                    multiline = false;

                    if(rawcmd.indexOf("\n") >= 0) {
                        multiline = true;
                        body = rawcmd.split("\n").slice(1)
                        rawcmd = rawcmd.split("\n")[0] 
                    }

                    rawcmd = rawcmd.replace(/\[CQ:at,qq=(\d+)\]/, (match, qq) => {
                        return "| at " + qq
                    })

                    rawcmd = rawcmd.split("|")
                    var last_res = null;
                    for(var i = 0; i < rawcmd.length; i++) {
                        var arguments = shellquote.parse(rawcmd[i])
                        var cmd = arguments[0]
                        var args = []
                        var kwargs = {}
                        for(var ai = 1; ai < arguments.length; ai++) {
                            if(arguments[ai].indexOf('=') >= 0) {
                                kv = arguments[ai].split("=")
                                kwargs[kv[0]]=kv[1]
                            } else {
                                args.push(arguments[ai])
                            }
                        }

                        if(global.handlers[cmd]!=null) {
                            last_res = global.handlers[cmd].handle(cqc, message, cmd, args, kwargs, last_res, body);
                        } else {
                            cqc.privmsg(message['user_id'], "[CQ:shake]")
                            cqc.privmsg(message['user_id'], "Command " + cmd + " no handler found")
                            break;
                        }
                    }
                    if(last_res != null && i == rawcmd.length){
                        cqc.groupmsg(message['group_id'], last_res)
                    }
                }else{
                    for(var i = 0; i < (global.pipes || []).length; i++) {
                        var pipe = global.pipes[i];
                        var res = pipe.pipe(cqc, message);
                        if(res && (res.block == true)) {
                            break;
                        }
                    }
                }
            }

            if(message['message_type'] == "private"){
                cqc.privmsg(message.user_id, JSON.stringify(message['message']))
                if(message['user_id'] == 1254847698) {
                    cqc.groupmsg(251125235, message['message'].slice(1))
                }
            }else if(message['message_type'] == "group") {
                handleGroupMessage(message)
            }
        });
        cqc.privmsg(1254847698, "Go!");
    }
  });
