import * as express from "express";
import * as bodyParser from "body-parser";
import {SamsungRemote} from "./samsungremote";
import * as Xbox from "xbox-on";
import {Detector, Device} from "./detectCMD";

let samsungTVip = process.env.tv_ip;
let samsungBRip = process.env.br_ip;
let xboxOneIP = process.env.xbox_one_ip;
let xboxOneliveDeviceId = process.env.xbox_one_live_device_id;

let witToken = process.env.wit_token;
let witConfidence = process.env.wit_confidence;


let router = express.Router();

let remoteTV = samsungTVip ? new SamsungRemote("SAMSUNG TV", samsungTVip) : null;
let remoteBR = samsungBRip ? new SamsungRemote("SAMSUNG BR", samsungBRip) : null;
let xboxOne = xboxOneIP ? new Xbox(xboxOneIP, xboxOneliveDeviceId) : null;

let detector = new Detector({
    witToken: witToken,
    witConfidence: witConfidence
});

router.use(bodyParser.json());

router.get("/hook", (req, resp)=> {
    console.log("sent ok");
    resp.send("ok");
});

router.post("/hook", (req, resp)=> {
    if (req.body) {
        console.log(req.body);
    }

    if (req.body.type === "voice-control") {
        let data: string = req.body.data;

        if (data) {
            detector.detect(data).then((detectedCMDs)=> {

                detectedCMDs.forEach((detectedCMD)=> {

                    console.log("detected: " + JSON.stringify(detectedCMD));

                    if (detectedCMD.device === Device.NONE || !detectedCMD.cmdDefinition) {
                        console.log("no match detected");
                        return;
                    }

                    if (detectedCMD.device === Device.TELEVISION && remoteTV) {
                        for (let x = 0; x < detectedCMD.times; x++) {
                            setTimeout(()=> {
                                remoteTV.send(detectedCMD.cmdDefinition.cmd);
                            }, x * 500);
                        }
                    } else if (detectedCMD.device === Device.BLURAY && remoteBR) {
                        for (let x = 0; x < detectedCMD.times; x++) {
                            setTimeout(()=> {
                                remoteBR.send(detectedCMD.cmdDefinition.cmd);
                            }, x * 500);
                        }
                    } else if (detectedCMD.device === Device.XBOX_ONE && xboxOne) {
                        if (detectedCMD.cmdDefinition.cmd === "on") {

                            let options = {
                                tries: 5,
                                delay: 1000,
                                waitForCallback: true
                            };
                            for (let x = 0; x < 5; x++) {
                                setTimeout(()=> {
                                    xboxOne.powerOn(options)
                                }, x * 1000);
                            }
                        }
                    }
                });
            });

        }

    }
    resp.send("ok");
});

export default router;