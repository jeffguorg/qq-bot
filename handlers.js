const translate = require("./translate").APIs;
const config = require("./config");

class CQHandler{
    constructor (...cmds) {
        global.handlers = global.handlers || {};
        cmds.forEach((cmd) => {
            global.handlers[cmd] = this;
        })
        if(this.pipe != null){
            global.pipes = global.pipes || [];
            global.pipes.push(this)
        }
    }

    handle(cqc, message, cmd, args=[], kwargs={}, last=null, body=null) {
        if(global.debug == true) {
            console.debug("received single line request " + cmd);
        }
    }
}

class KeywordResponder extends CQHandler {
    constructor() {
        super("kw")
        this.kw = require("./keywords");
    }

    handle(cqc, message, cmd, args=[], kwargs={}, last=null, body=null) {
    }
    pipe(cqc, message) {
        for(var ind=0; ind < this.kw.length; ind++) {
            if(this.kw[ind].condition(message['message'])) {
                cqc.groupmsg(message['group_id'], this.kw[ind].respond(message['message']))
                return {
                    block: true
                }
            }
        }
        return {
            block: false
        }
    }
}

class AtHandler extends CQHandler {
    constructor() {
        super("at");
    }
    handle(cqc, message, cmd, args=[], kwargs={}, last=null, body=null) {
        super.handle(cmd)
        if(message["message_type"] != "group") {
            return [{
                "type": "text",
                "data": {
                    "text": "无法在群聊外 @ 其他人"
                }
            }]
        }
        if(args.length > 0) {
            var resp =  [];
            
            if(body) {
                resp.push({
                    "type": "text",
                    "data": {
                        "text": (body || []).join("\n")
                    }
                })
                resp.push({
                    "type": "text",
                    "data": {
                        "text": "\n"
                    }
                })
            }else if(last) {
                resp=last
                resp.push({
                    "type": "text",
                    "data": {
                        "text": "\n"
                    }
                })
            }
            for(var ind = 0; ind < args.length; ind++){
                resp.push({
                    "type": "at",
                    "data": {
                        "qq": args[ind]
                    }
                })
            }
            return resp
        } 
    }
}

class StringHandler extends CQHandler{
    handle(cqc, message, cmd, args=[], kwargs={}, last=null, body=null) {
    }
}

class RepeatHandler extends CQHandler {
    constructor(cmd, pipe_stop=true) {
        super(cmd);
        RepeatHandler.state = RepeatHandler.state || {
            machines: {}
        };
        this.pipe_stop = pipe_stop;
    }
    handle(cqc, message, cmd, args=[], kwargs={}, last=null, body=null) {
        super.handle(cmd)
        if(message["message_type"] != "group") {
            return [{
                "type": "text",
                "data": {
                    "text": "无法在群聊以外的地方启用复读机"
                }
            }]
        }
        let possibility = kwargs.possibility || 1
        if(message["user_id"] != 1254847698) {
            possibility = Math.min(kwargs.possibility, config.repeat.posibility_cap);
        }
        if(cmd == "repeat") {
            if(args.length == 0){
                RepeatHandler.state.machines[message['group_id']] = 
                    RepeatHandler.state.machines[message['group_id']] == null?
                        {on: true, possibility}:
                        (RepeatHandler.state.machines[message['group_id']].on == true ? { on: false}: {
                            on: true,
                            possibility
                        });
            } else {
                if(args[0].toLowerCase() == "on") {
                    RepeatHandler.state.machines[message['group_id']] = {
                        on: true,
                        possibility,
                    };
                } else if(args[0].toLowerCase() == "off") {
                    RepeatHandler.state.machines[message['group_id']] = {
                        on: false
                    };
                }
            }
            cqc.groupmsg(message['group_id'], "repeat machine " + (RepeatHandler.state.machines[message['group_id']].on == true ?"on":"off"));
        }
    }
    pipe(cqc, message) {
        if(message['message_type'] == 'group'){
            if(RepeatHandler.state.machines[message['group_id']] && RepeatHandler.state.machines[message['group_id']].on == true) {
                if(Math.random() < RepeatHandler.state.machines[message['group_id']].possibility){
                    cqc.groupmsg(message['group_id'], message['message'])
                    return {
                        block: this.pipe_stop
                    }
                }
            }
        }
        return {
            block: false
        }
    }
}

class ShortHandler extends CQHandler {
    constructor(cmd) {
        super(cmd)
        this.shorts = require("./shorts")
    }
    handle(cqc, message, cmd, args=[], kwargs={}, last=null, body=null) {
        var results = []
        if(args.length > 0) {
            for(var ind = 0; ind < args.length; ind ++){
                if(results.length > 0) {
                    results.push({
                        "type": "text",
                        "data": {
                            "text": "\n"
                        }
                    })
                }
                if(this.shorts[args[ind]] != null) {
                    results = results.concat(this.shorts[args[ind]])
                } else {
                    results.push({
                        "type": "text",
                        "data": {
                            "text": "呃， 你说啥？"
                        }
                    })
    
                }
            }
        }else{
            results.push({
                "type": "text",
                "data": {
                    "text": "现已支持的短链接有: "
                }
            })
            for(const [key, val] of Object.entries(this.shorts)) {
                results.push({
                    "type": "text",
                    "data": {
                        "text": (key + " ")
                    }
                })
            }
        }
        return results
    }
}

class CatHandler extends CQHandler {
    handle(cqc, message, cmd, args=[], kwargs={}, last=null, body=null) {
        if(cmd == "cat") {
            return body.join("\n");
        }
    }
}

class JoinHandler extends CQHandler {

    constructor(cmd) {
        super("approve", "deny")
    }

    usage(cqc, user_id) {
        cqc.privmsg(user_id, 
            `+approve <type> <flag>
            +approve <flag> type=<type>
            +approve <type> flag=<flag>
            +approve type=<type> flag=<flag>`)
    }

    handle(cqc, message, cmd, args=[], kwargs={}, last=null, body=null) {
        if(message["user_id"] != 1254847698) {
            return;
        }
        var flag = null;
        var reqtype = null;
        if(args.length > 2) {
            this.usage(cqc, message["user_id"])
            return;
        }
        if(args.length == 2) {
            reqtype = args[0];
            flag = args[1];
        } else if(args.length == 1) {
            if('flag' in kwargs) {
                flag = kwargs.flag;
                reqtype = args[0]
            } else {
                reqtype = kwargs.type;
                flag = args[0]
            }
        } else {
            reqtype = kwargs.type;
            flag = kwargs.flag;
        }
        if(!flag || !reqtype) {
            this.usage(cqc, message["user_id"])
            return;
        }
        switch(reqtype) {
            case "friend":
                cqc.set_friend_add_request(flag, cmd == "approve")
                break;
            default:
                cqc.set_group_request(flag, reqtype, cmd == "approve")
                break;
        }
    }
}

class LeaveHandler extends CQHandler {
    constructor(cmd = "leave") {
        super(cmd);
        this.cmd = cmd;
    }

    handle(cqc, message, cmd, args=[], kwargs={}, last=null, body=null) {
        if(message["user_id"] == 1254847698) {
            let group_id = parseInt(args[0] || kwargs.group || kwargs.group_id);
            cqc.privmsg(1254847698, `leaving ${group_id}`)
            cqc.group_leave(group_id)
        }
    }
}

class TranslateHandler extends CQHandler {
    constructor(cmd) {
        super(cmd);
        this.cmd = cmd;
        this.api = new translate.QCloud(config.translate.qcloud.secret_id, config.translate.qcloud.secret_key);
        TranslateHandler.state = TranslateHandler.state || {
            "targets": {}
        }
    }
    handle(cqc, message, cmd, args=[], kwargs={}, last=null, body=null) {
        var results = []
        switch (args.length) {
            case 0:
                if (!("to" in kwargs)) {
                    cqc.groupmsg(message["group_id"], "+" + this.cmd + " [from=<language code>|auto] to=<language code>")
                } else {
                    var user_id = message['user_id'];
                    if(message["user_id"] == 1254847698) {
                        if(kwargs.user_id) {
                            user_id = kwargs.user_id
                        }
                    }
                    TranslateHandler.state.targets[user_id] = {
                        "from": kwargs.from || "auto",
                        "to": kwargs.to,
                        "match": new RegExp(kwargs.match || ".+")
                    };
                    cqc.groupmsg(message['group_id'], "added to targets")
                }
                break;
            case 1:
                switch (args[0]) {
                    case 'help':
                        return "Try this in group chat:\n +" + this.cmd + " [from=<language code>|auto] to=<language code>"
                    case 'code':
                        return "Language codes:\n\
                        zh : 中文\n\
                        en : 英文\n\
                        jp : 日语\n\
                        kr : 韩语\n\
                        de : 德语\n\
                        fr : 法语\n\
                        es : 西班牙文\n\
                        it : 意大利文\n\
                        tr : 土耳其文\n\
                        ru : 俄文\n\
                        pt : 葡萄牙文\n\
                        vi : 越南文\n\
                        id : 印度尼西亚文\n\
                        ms : 马来西亚文\n\
                        th : 泰文\n\
                        auto : 自动识别源语言，只能用于from字段"
                    case 'off':
                        var qq = kwargs.qq || message['user_id'];
                        delete TranslateHandler.state.targets[qq];
                        break;
                }
                break;
            default:
        }
        
        return results;
    }
    pipe(cqc, message) {
        for(var qq in TranslateHandler.state.targets) {
            if(message['user_id'] == qq && TranslateHandler.state.targets[qq].match.test(message['message'])) {
                (function(api, cqc, msg, group_id) {
                    function callback(response) {
                        cqc.groupmsg(group_id, response);
                    }
                    api.translate(msg['message'], TranslateHandler.state.targets[qq].from, TranslateHandler.state.targets[qq].to, callback);
                })(this.api, cqc, message, message['group_id']);
            }
        }
    }
}

module.exports = {
    AtHandler,
    CatHandler,
    RepeatHandler,
    KeywordResponder,
    ShortHandler,
    TranslateHandler,
    JoinHandler,
    LeaveHandler,
}
