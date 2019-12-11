const request=require("request");
const md5 = require("md5");
const config = require("./config");
const tencentcloud = require("tencentcloud-sdk-nodejs");

const TmtClient = tencentcloud.tmt.v20180321.Client;
const models = tencentcloud.tmt.v20180321.Models;

const Credential = tencentcloud.common.Credential;
const ClientProfile = tencentcloud.common.ClientProfile;
const HttpProfile = tencentcloud.common.HttpProfile;

class TranslateAPI {
    constructor(endpoint) {
        this.endpoint=endpoint;
    }
    translate(message) {
        throw new Error("Not implemented")
    }
}

class QCloudTranslateAPI extends TranslateAPI {
    constructor(appid, key){
        super("tmt.tencentcloudapi.com");
        var cred = new Credential(appid, key);

        var httpProfile = new HttpProfile();
        httpProfile.endpoint = "tmt.tencentcloudapi.com";
        var clientProfile = new ClientProfile();
        clientProfile.httpProfile = httpProfile;
        this.client = new TmtClient(cred, "ap-shanghai", clientProfile);
    }

    translate(message, from, to, callback){
        var req = new models.TextTranslateRequest();
        req.from_json_string(JSON.stringify({
            "SourceText": message,
            "Source": from || "auto",
            "Target": to,
            "ProjectId": "0"
        }))
        this.client.TextTranslate(req, function(errMsg, response){
            if(errMsg){
                callback(JSON.stringify(errMsg));
            }else{
                callback(response.TargetText);
            }
        })
    }
    
}

class BaiduTranslateAPI extends TranslateAPI {
    constructor(appid, key) {
        super("https://fanyi-api.baidu.com/api/trans/vip/translate")
        this.appid = appid || config.translate.baidu.appid;
        this.key = key || config.translate.baidu.key;
        this.md5 = require("./md5").MD5
        console.log(this);
    }
    sign(salt, msg) {
        var orig = this.appid + msg + salt + this.key;
        console.log(orig)
        return md5(orig);
    }
    translate(msg, from, to, callback) {
        var salt = (new Date).getTime();
        var data = JSON.stringify({
            q: msg,
            from: from,
            to: to, 
            appid: this.appid,
            salt: salt,
            sign: this.sign(salt, msg)
        })
        console.log(this.endpoint, data)
        request.post(this.endpoint, {
            url: this.endpoint,
            body: data,
            json: true
        }, (err, response, body) => {
            console.log(err);
            console.log(response);
            console.log(body);
            callback(body);
        })
    }
}

exports.APIs = {
    Baidu: BaiduTranslateAPI,
    QCloud: QCloudTranslateAPI
}
