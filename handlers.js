const translate = require("./translate").APIs;
const config = require("./config");
//const cache = require("./cache");

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
                        "qq": parseInt(args[ind])
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
        if(message["message_type"] != "group") {
            return [{
                "type": "text",
                "data": {
                    "text": "无法在群聊以外的地方启用复读机"
                }
            }]
        }
        let possibility = kwargs.possibility || 1
        if(config.admin.indexOf(message["user_id"]) < 0) {
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
            return (body || []).join("\n");
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
        if(config.admin.indexOf(message["user_id"]) < 0) {
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
        if(config.admin.indexOf(message["user_id"]) >= 0) {
            let group_id = parseInt(args[0] || kwargs.group || kwargs.group_id);
            cqc.privmsg(message["user_id"], `leaving ${group_id}`)
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

    get help_message() {
        return "+" + this.cmd + " [from=<language code>|auto] [match=<regexp>] to=<language code>"
    }

    handle(cqc, message, cmd, args=[], kwargs={}, last=null, body=null) {
        var results = []
        if(message["message_type"] != "group") {
            return;
        }
        let {user_id, group_id} = message;
        if(config.admin.indexOf(message["user_id"]) >= 0) {
            if(kwargs.user_id) {
                user_id = kwargs.user_id
            }      
            if(kwargs.group_id) {
                user_id = kwargs.group_id
            }
        }

        switch (args.length) {
            case 0:
                if (!("to" in kwargs)) {
                    cqc.groupmsg(group_id, this.help_message)
                } else {
                    TranslateHandler.state.targets[`${group_id}:${user_id}`] = {
                        "from": kwargs.from || "auto",
                        "to": kwargs.to,
                        "match": new RegExp(kwargs.match || ".+")
                    };
                    cqc.groupmsg(message['group_id'], `${user_id} added`)
                }
                break;
            case 1:
                switch (args[0]) {
                    case 'help':
                        return "Try this in group chat:\n +" + this.help_message;
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
                        delete TranslateHandler.state.targets[`${group_id}:${user_id}`];
                        break;
                }
                break;
            default:
        }
        
        return results;
    }
    pipe(cqc, message) {
        if(message["message_type"] != "group") {
            return;
        }
        let {user_id, group_id} = message;
        let key = `${group_id}:${user_id}`;
        if(key in TranslateHandler.state.targets) {
            if(config.debug) {
                console.log(TranslateHandler.state.targets[key].match.test(message['message']));
            }
            if(TranslateHandler.state.targets[key].match.test(message['message'])) {
                this.api.translate(message['message'], TranslateHandler.state.targets[key].from, TranslateHandler.state.targets[key].to, (response) => {
                    cqc.groupmsg(group_id, response);
                });
            }
        }
    }
}

class ScheduleHandler extends CQHandler {
    constructor() {
        super("schedule", "sched", "sched-cancel")

        let second = 1000;
        let minute = second * 60;
        let hour = minute * 60;
        let day = hour * 24;
        let week = day * 7;
        let year = day * 365;
        
        this.unit = {
            s: second,
            m: minute,
            h: hour,
            d: day,
            w: week,
            y: year,
        }
    }

    handle(cqc, message, cmd, args=[], kwargs={}, last=null, body=null) {
        if(last == null) {
            return "Please concatenate this command in the end";
        }
        if(cmd == 'sched-cancel') {
            clearTimeout(parseInt(args[0]))
        }

        if(args.length == 0) {
            return "Please specify a time delta or a date";
        }
        let spec = args[0];
        var time = Date.now();
        var timeoutid = 0;
        console.log(spec[spec.length-1], spec[0], spec.slice(1, -1), parseFloat(spec.slice(1, -1)), this.unit[spec[spec.length-1]]);
        switch(spec[0]) {
            case '+':
            case '-':
                console.log("asdf")
                var sign = spec[0] == '+'?1:-1;
                if(spec[spec.length-1] in this.unit) {
                    time += sign * parseFloat(spec.slice(1, -1)) * this.unit[spec[spec.length-1]];
                }
                break;
            default:
                    console.log("parse")
                time = Date.parse(spec)
        }
        if(!time) {
            return "unable to parse date or time delta"
        }
        switch(message["message_type"]) {
            case "group":
                timeoutid = setTimeout(() => {
                    cqc.groupmsg(message["group_id"], last)
                }, time - Date.now())
                break;
            case "private":
                timeoutid = setTimeout(() => {
                    cqc.privmsg(message["user_id"], last)
                }, time - Date.now())
                break;
            default:
                return;
        }
        return `timeout scheduled after ${(time - Date.now()) / 1000}`
    }
}

class PingHandler extends CQHandler {
    constructor(cmd = null) {
        super(cmd || "ping")
    }

    handle(cqc, message, cmd, args = [], kwargs = {}, last = null, body = null) {
        return "pong"
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
    PingHandler,
    ScheduleHandler
}
