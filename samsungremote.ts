import * as SamsungRemoteExt from "samsung-remote"

export class SamsungRemote {

    lib: any;
    name: string;
    ip: string;

    constructor(name: string, ip: string) {
        this.name = name;
        this.ip = ip;
        this.lib = new SamsungRemoteExt({ip: ip});
    }

    send = (KEY: string)=> {
        this.lib.send(KEY, (err: Error)=> {
            let msg = err ? err.message : "ok";
            console.log(this.ip + ":" + this.name + ":" + msg);
        })
    }
}

