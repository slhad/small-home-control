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
    {cmd: "KEY_HDMI", uniqTerm: "selectHDMI", terms: ["select hdmi", "selectionne hdmi"]},
    {cmd: "KEY_VOLUP", uniqTerm: "volumeUp", terms: ["plus fort", "louder", "volume up", "monte le son"], multiple: true},
    {cmd: "KEY_VOLDOWN", uniqTerm: "volumeDown", terms: ["moins fort", "quieter", "volume down", "baisse le son"], multiple: true},
    {cmd: "KEY_MUTE", uniqTerm: "volumeMute", terms: ["shut up", "mute", "ta gueule", "ferme la", "tais-toi", "tais - toi", "tais toi"]},
    {cmd: "on", uniqTerm: "powerOn", terms: ["allumage", "power on", "ok", "on", "reveille toi", "réveille - toi", "wake up", "up"]}
];

let contains = (data: string, search: string)=> {
    return data.indexOf(search) >= 0;
};

enum VoiceCMDBuilderKey {
    DEVICES = 1,
    CMDS,
    TIMES,
    HDMINUMBERS
}

class VoiceCMDBuilder {
    data: any;

    constructor() {
        this.data = {};
    }

    push = (key: string, data: any)=> {
        if (!( key in this.data)) {
            this.data[key] = [];
        }

        this.data[key].push(data);
    }

    pushDevice = (data: Device) => {
        if (data) {
            this.push(VoiceCMDBuilderKey[VoiceCMDBuilderKey.DEVICES], data);
        }
    }

    pushTimes = (data: number) => {
        if (data) {
            this.push(VoiceCMDBuilderKey[VoiceCMDBuilderKey.TIMES], data);
        }
    }

    pushCMD = (data: AssociationCMD) => {
        if (data) {
            this.push(VoiceCMDBuilderKey[VoiceCMDBuilderKey.CMDS], data);
        }
    }

    pushHDMINumber = (data: number) => {
        if (data) {
            this.push(VoiceCMDBuilderKey[VoiceCMDBuilderKey.HDMINUMBERS], data);
        }
    }

    length = ()=> {
        let key = VoiceCMDBuilderKey[VoiceCMDBuilderKey.DEVICES];
        return key in this.data && this.data[key] && this.data[key].length || 0;
    }

    shift = (key: string)=> {
        if (key in this.data && this.data[key] && this.data[key].length) {
            return this.data[key].shift();
        }
    }

    shiftDevice = (): Device => {
        return this.shift(VoiceCMDBuilderKey[VoiceCMDBuilderKey.DEVICES]) as Device;
    }

    shiftTimes = (): number => {
        return this.shift(VoiceCMDBuilderKey[VoiceCMDBuilderKey.TIMES]) as number;
    }

    shiftHDMINumber = (): number => {
        return this.shift(VoiceCMDBuilderKey[VoiceCMDBuilderKey.HDMINUMBERS]) as number;
    }

    shiftCMD = (): AssociationCMD => {
        return this.shift(VoiceCMDBuilderKey[VoiceCMDBuilderKey.CMDS]) as AssociationCMD;
    }

    build = (): VoiceCMD[] => {
        let array: VoiceCMD[] = [];

        if (this.length()) {

            let device;
            while (device = this.shift(VoiceCMDBuilderKey[VoiceCMDBuilderKey.DEVICES])) {

                let voiceCMD: VoiceCMD = {
                    device: device,
                    cmdDefinition: this.shiftCMD(),
                    times: 1
                }

                if (voiceCMD.cmdDefinition) {

                    if (voiceCMD.cmdDefinition.uniqTerm === "selectHDMI") {
                        let hdmiNumber = this.shiftHDMINumber();
                        voiceCMD.cmdDefinition = JSON.parse(JSON.stringify(voiceCMD.cmdDefinition));
                        voiceCMD.cmdDefinition.cmd = voiceCMD.cmdDefinition.cmd + hdmiNumber;
                    }


                    if (voiceCMD.cmdDefinition.multiple) {
                        let times = this.shiftTimes();
                        if (times) {
                            voiceCMD.times = times;
                        }
                    }
                }

                array.push(voiceCMD);
            }

        }
        return array;
    }
}

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


    detect = (data: string): Promise<VoiceCMD[]> => {
        if (this.witToken) {
            return this.detectWit(data).catch((rejected)=> {
                console.log("ERROR WIT: " + rejected);
                return this.detectClassic(data);
            })
        } else {
            return this.detectClassic(data);
        }
    };

    detectWit = (data: string): Promise<VoiceCMD[]> => {
        return this.witClient.message(data, {}).then((sentence)=> {
            console.log(JSON.stringify(sentence));
            return new Promise<VoiceCMD[]>((accept, reject)=> {

                let builder = new VoiceCMDBuilder();

                for (let entityKey in sentence.entities) {

                    let entityValues: MessageResponseEntity[] = sentence.entities[entityKey];

                    for (let entityValue of entityValues) {

                        let value = entityValue.value;
                        let confidence = entityValue.confidence;

                        if (confidence >= this.witConfidenceLimit) {

                            if (entityKey === "device") {
                                builder.pushDevice(this.detectUniqDevice(value));
                            } else if (entityKey === "on_off_toggle") {
                                let powerChoice = "power" + value.substr(0, 1).toUpperCase() + value.substr(1);
                                builder.pushCMD(this.detectUniqCMD(powerChoice));
                            } else if (entityKey === "times" || entityKey === "number") {
                                builder.pushTimes(value as any as number);
                            } else if (entityKey === "hdmiNumber") {
                                builder.pushHDMINumber(value as any as number);
                            } else {
                                builder.pushCMD(this.detectUniqCMD(entityKey));
                            }
                        }
                    }
                }

                accept(builder.build());
            });
        });
    };

    detectClassic = (data: string): Promise<VoiceCMD[]> => {

        let detected: VoiceCMD = null;

        return new Promise<VoiceCMD[]>((accept, reject)=> {
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

                let array = [];
                array.push(detected);

                accept(array);
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