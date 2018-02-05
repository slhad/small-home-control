import * as SamsungRemoteExt from "samsung-remote"

export class SamsungRemote {

    lib: SamsungRemoteExt;
    name: string;
    ip: string;

    constructor(name, ip: string) {
        this.name = name;
        this.ip = ip;
        this.lib = new SamsungRemoteExt({ip: ip});
    }

    send = (KEY)=> {
        this.lib.send(KEY, (err)=> {
            let msg = err ? err.message : "ok";
            console.log(this.ip + ":" + this.name + ":" + msg);
        })
    }
}

