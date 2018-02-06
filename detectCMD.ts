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
    device: Device
}

type AssociationCMD = {
    cmd: string,
    terms: String[],
    multiple?: boolean
}

let assocDevices: AssociationDevice[] = [
    {device: Device.TELEVISION, terms: ["tv", "télé", "tele", "télévision", "television"]},
    {device: Device.BLURAY, terms: ["br", "bluray", "blu - ray"]},
    {device: Device.XBOX_ONE, terms: ["xbox", "xbox one"]},
];

let assocCMD: AssociationCMD[] = [
    {cmd: "KEY_HDMI1", terms: ["select hdmi 1", "selectionne hdmi 1"]},
    {cmd: "KEY_HDMI2", terms: ["select hdmi 2", "selectionne hdmi 2"]},
    {cmd: "KEY_HDMI3", terms: ["select hdmi 3", "selectionne hdmi 3"]},
    {cmd: "KEY_HDMI4", terms: ["select hdmi 4", "selectionne hdmi 4"]},
    {cmd: "KEY_VOLUP", terms: ["plus fort", "louder", "volume up", "monte le son"], multiple: true},
    {cmd: "KEY_VOLDOWN", terms: ["moins fort", "quieter", "volume down", "baisse le son"], multiple: true},
    {cmd: "KEY_MUTE", terms: ["shut up", "mute", "ta gueule", "ferme la", "tais-toi", "tais - toi", "tais toi"]},
    {cmd: "on", terms: ["allumage", "power on", "ok", "on", "reveille toi", "réveille - toi", "wake up", "up"]}
];

let contains = (data, search)=> {
    return data.indexOf(search) >= 0;
};

export class Detector {
    detect = (data): VoiceCMD=> {

        let detected: VoiceCMD = null;

        if (!data) {
            return detected;
        } else {
            data = data.toLowerCase().trim();
            console.log("detector:[" + data + "]")
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
        }


        return detected;
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