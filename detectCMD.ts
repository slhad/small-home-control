import {Wit, MessageResponseEntity} from "node-wit";

export type VoiceCMD = {
    times: number;
    device: Device;
    cmdDefinition: AssociationCMD;
}

export enum Device {
    NONE = 0,
    BLURAY,
    TELEVISION,
    XBOX_ONE
}

type AssociationDevice = {
    terms: String[],
    device: Device,
    uniqTerm: string
}

type AssociationCMD = {
    cmd: string,
    terms: String[],
    uniqTerm: string,
    multiple?: boolean
}

let assocDevices: AssociationDevice[] = [
    {device: Device.TELEVISION, uniqTerm: "tv", terms: ["tv", "télé", "tele", "télévision", "television"]},
    {device: Device.BLURAY, uniqTerm: "bluray", terms: ["br", "bluray", "blu - ray"]},
    {device: Device.XBOX_ONE, uniqTerm: "xbox_one", terms: ["xbox", "xbox one"]},
];

let assocCMD: AssociationCMD[] = [
    {cmd: "KEY_HDMI1", uniqTerm: "selectHDMI1", terms: ["select hdmi 1", "selectionne hdmi 1"]},
    {cmd: "KEY_HDMI2", uniqTerm: "selectHDMI2", terms: ["select hdmi 2", "selectionne hdmi 2"]},
    {cmd: "KEY_HDMI3", uniqTerm: "selectHDMI3", terms: ["select hdmi 3", "selectionne hdmi 3"]},
    {cmd: "KEY_HDMI4", uniqTerm: "selectHDMI4", terms: ["select hdmi 4", "selectionne hdmi 4"]},
    {cmd: "KEY_VOLUP", uniqTerm: "volumeUp", terms: ["plus fort", "louder", "volume up", "monte le son"], multiple: true},
    {cmd: "KEY_VOLDOWN", uniqTerm: "volumeDown", terms: ["moins fort", "quieter", "volume down", "baisse le son"], multiple: true},
    {cmd: "KEY_MUTE", uniqTerm: "volumeMute", terms: ["shut up", "mute", "ta gueule", "ferme la", "tais-toi", "tais - toi", "tais toi"]},
    {cmd: "on", uniqTerm: "powerOn", terms: ["allumage", "power on", "ok", "on", "reveille toi", "réveille - toi", "wake up", "up"]}
];

let contains = (data: string, search: string)=> {
    return data.indexOf(search) >= 0;
};

export class Detector {
    witToken: string;
    witClient: Wit;
    witConfidenceLimit: number;

    constructor(options?: any) {
        if (options && options.witToken) {
            this.witToken = options.witToken;
            this.witConfidenceLimit = options.witConfidence || 0.8;
            this.witClient = new Wit({accessToken: this.witToken});
        }
    }


    detect = (data: string): Promise<VoiceCMD> => {
        if (this.witToken) {
            return this.detectWit(data).catch((rejected)=> {
                console.log("ERROR WIT: " + rejected);
                return this.detectClassic(data);
            })
        } else {
            return this.detectClassic(data);
        }
    };

    detectWit = (data: string): Promise<VoiceCMD> => {
        return this.witClient.message(data, {}).then((sentence)=> {
            return new Promise<VoiceCMD>((accept, reject)=> {

                let cmdDef: AssociationCMD = null;
                let times = 1;
                let device = Device.NONE;

                for (let entityKey in sentence.entities) {

                    let entityValues: MessageResponseEntity[] = sentence.entities[entityKey];

                    for (let entityValue of entityValues) {

                        let value = entityValue.value;
                        let confidence = entityValue.confidence;

                        if (confidence >= this.witConfidenceLimit) {

                            if (entityKey === "device") {
                                device = this.detectUniqDevice(value);
                            } else if (entityKey === "on_off") {
                                let powerChoice = "power" + value.substr(0, 1).toUpperCase() + value.substr(1);
                                cmdDef = this.detectUniqCMD(powerChoice);
                            } else if (entityKey === "number") {
                                times = value as any as number;
                            }
                        }
                    }
                }

                if (cmdDef && !cmdDef.multiple) {
                    times = 1;
                }

                let voiceCMD: VoiceCMD = {
                    cmdDefinition: cmdDef,
                    device: device,
                    times: times
                };

                accept(voiceCMD);
            });
        });
    };

    detectClassic = (data: string): Promise<VoiceCMD> => {

        let detected: VoiceCMD = null;

        return new Promise<VoiceCMD>((accept, reject)=> {
            if (!data) {
                reject(detected);
            } else {
                data = data.toLowerCase().trim();
                console.log("detector:[" + data + "]");
                detected = {
                    device: this.detectDevice(data),
                    times: 0,
                    cmdDefinition: this.detectCMD(data)
                };

                if (detected.device !== Device.NONE) {

                    console.log("device detected : [" + Device[detected.device] + "]");

                    if (detected.cmdDefinition) {
                        console.log("cmd : [" + JSON.stringify(detected.cmdDefinition) + "]");
                    }

                    if (detected.cmdDefinition && detected.cmdDefinition.multiple) {
                        detected.times = this.detectTimes(data);
                    } else {
                        detected.times = 1;
                    }
                }
                accept(detected);
            }
        });
    };

    detectDevice = (data: string): Device=> {

        let device = Device.NONE;

        assocDevices.forEach((item)=> {
            item.terms.forEach((term: string)=> {
                if (contains(data, term)) {
                    device = item.device;
                }
            });
        });

        return device;
    };

    detectCMD = (data: string): AssociationCMD => {
        let cmd: AssociationCMD;

        assocCMD.forEach((item)=> {
            item.terms.forEach((term: string)=> {
                if (contains(data, term)) {
                    cmd = item;
                }
            });
        });

        return cmd;
    };

    detectUniqCMD = (data: string): AssociationCMD => {
        let assoc: AssociationCMD;
        assocCMD.forEach((item)=> {
            if (item.uniqTerm === data) {
                assoc = item;
            }
        })

        return assoc;
    };

    detectUniqDevice = (data: string): Device => {
        let device = Device.NONE;

        assocDevices.forEach((item)=> {
            if (item.uniqTerm === data) {
                device = item.device;
            }
        });

        return device;
    };

    detectTimes = (data: string): number=> {

        let splited = data.split(" ");

        let index = -1;

        splited.forEach((val, indexI)=> {
            if (val === "times"
                || val === "time"
                || val === "fois") {
                index = indexI;
            }
        });

        if (index > 0 && index <= splited.length) {
            try {
                return parseInt(splited[index - 1]);
            } catch (e) {
                console.log("Parsing error for times [" + splited[index - 1] + "]");
                return 1;
            }
        }

        return 1;
    };
}