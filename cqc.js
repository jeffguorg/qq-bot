const ws = require("ws")

const events = require("events");

module.exports = class CQClient extends events.EventEmitter {
    constructor(endpoint) {
        super();

        this.ws = new ws(endpoint);
        this.ws.on("open", (ws) => {
            this.emit("open")
        })
        
        this.ws.on("pong", () => {
            this.emit("pong")
        })
        this.ws.on("ping", () => {
            this.emit("ping")
        })

        this.ws.on("message", (data)=>{
            if(global.echo == true)
                console.debug("ws on_message: ", data)
        })
    }

    ping() {
        this.ws.ping()
    }

    send(data) {
        if(this.ws.readyState == ws.OPEN) {
            if(global.debug == true){
                console.debug("ws send: ", data)
            }
            this.ws.send(data)
        }
    }

    groupmsg(to, msg) {
        if(global.debug == true){
            console.debug("cqc groupmsg")
        }

        this.send(JSON.stringify({
            "action": "send_group_msg",
            "params": {
                "group_id": to,
                "message": msg
            }
        }))
    }
    privmsg(to, msg) {
        if(global.debug == true){
            console.debug("cqc privmsg")
        }

        this.send(JSON.stringify({
            "action": "send_private_msg",
            "params": {
                "user_id": to,
                "message": msg
            }
        }))
    }
    drawback(msgid) {
        this.send(JSON.stringify({
            "action": "delete_msg",
            "params": {
                "message_id": msgid
            }
        }))
    }
    group_ban(group, user_id, duration) {
        this.send(JSON.stringify({
            "action": "set_group_ban",
            "params": {
                "group_id": group,
                "user_id": user_id,
                "duration": duration
            }
        }))
    }
    group_leave(group_id) {
        this.send(JSON.stringify({
            "action": "set_group_leave",
            "params": {
                group_id
            },
        }))
    }
    set_group_request(flag, sub_type, approve, reason=null) {
        this.send(JSON.stringify({
            "action": "set_group_add_request",
            "params": {
                flag,
                sub_type,
                approve,
                reason,
            }
        }))
    }
    set_friend_add_request(flag, approve, remark=null) {
        this.send(JSON.stringify({
            "action": "set_friend_add_request",
            "params": {
                flag,
                approve,
                remark,
            }
        }))
    }
}