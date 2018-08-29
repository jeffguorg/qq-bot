module.exports = [
    {
        "condition": (msg) => {
            var words = ["有", "大佬", "大神", "人", "会", "徒弟"];
            var count = 0;
            for(var ind=0; ind < words.length; ind++){
                count += (msg.indexOf(words[ind]) >= 0 ? 1: 0);
            }
            return count > 1 && (msg.endsWith("?") || msg.endsWith("？"));
        },
        "respond": (msg) => {
            return "没有"
        }
    },
    {
        "condition": (msg) => {
            var words = ["哪", "下载", "查不到", "地址", "传"];
            var count = 0;
            for(var ind=0; ind < words.length; ind++){
                count += (msg.indexOf(words[ind]) >= 0 ? 1: 0);
            }
            return count > 1;
        },
        "respond": (msg) => {
            return "baidu.com"
        }
    },
    {
        "condition": (msg) => {
            var count = 0;
            var last_pos = 0;
            while(msg.indexOf("喵", last_pos) >= 0) {
                last_pos = msg.indexOf("喵", last_pos) + "喵".length;
                count ++;
            }
            return ((count * 3) >= msg.length);
        },
        "respond": (msg) => {
            return "喵" + msg
        }
    },
    {
        "condition": (msg) => {
            var count = 0;
            var last_pos = 0;
            while(msg.indexOf("谢", last_pos) >= 0) {
                last_pos = msg.indexOf("谢", last_pos) + "谢".length;
                count ++;
            }
            return ((count * 2) >= msg.length);
        },
        "respond": (msg) => {
            return "不谢"
        }
    },
    
]