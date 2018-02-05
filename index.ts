import * as express from "express";
import router from "./router";

let server = express();
server.use("/", router);

server.listen(40000);