class CQHandler{
    constructor (cmd) {
        global.handlers = global.handlers || {};
        global.handlers[cmd] = this;
        if(this.pipe != null){
            global.pipes = global.pipes || [];
            global.pipes.push(this)
        }
    }

    handle(cmd) {
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
        if(cmd == "kw") {
            var domain = args[0] ;
            
        }
    }
    pipe(cqc, message) {
        for(var ind=0; ind < this.kw.length; ind++) {
            if(this.kw[ind].condition(message['message'])) {
                console.log(message)
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
        if(cmd == "repeat") {
            console.log(args, kwargs)
            if(args.length == 0){
                RepeatHandler.state.machines[message['group_id']] = 
                    RepeatHandler.state.machines[message['group_id']] == null?
                        {on: true}:
                        (RepeatHandler.state.machines[message['group_id']].on == true ? { on: false}: {
                            on: true
                        });
            } else {
                if(args[0].toLowerCase() == "on") {
                    RepeatHandler.state.machines[message['group_id']] = {
                        on: true,
                        possibility: kwargs['possibility'] == null? 1: parseFloat(kwargs['possibility'])
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

class TranslateHandler extends CQHandler {
    constructor(cmd) {
        super(cmd)
    }
    handle(cqc, message, cmd, args=[], kwargs={}, last=null, body=null) {
        
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

module.exports = {
    AtHandler: AtHandler,
    CatHandler: CatHandler,
    RepeatHandler: RepeatHandler,
    KeywordResponder, KeywordResponder,
    ShortHandler: ShortHandler,
}