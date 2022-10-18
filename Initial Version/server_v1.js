
/////////////////////// Works Fine for Listening Keyboard Inputs ///////////////////////

// const readline = require('readline');

// readline.emitKeypressEvents(process.stdin);
// process.stdin.setRawMode(true);

// process.stdin.on('keypress', (str, key) => {
  // console.log(str)
  // console.log(key)
// })

////////////////////////////////////////////////////////////////////////////////////////

//const sendkeys = require("sendkeys-js");

//// for win
//setInterval(() => {sendkeys.send('{right}')}, 1000);

////////////////////////////////////////////////////////////////////////////////////////

const express = require("express"); 
const ws = require("ws"); 
const screenshot = require('screenshot-desktop')
const imageProcessor = require("sharp");
const operatingSystem = require("os");
const { readFileSync } = require("fs");
const { exec, execFile } = require("child_process");
const path = require("path");
const { json, response } = require("express");

let networkInterfaceDetails = operatingSystem.networkInterfaces();
let computerName = operatingSystem.hostname();

const httpConfig = 
{
    portNumber: null,
    ipAddress: null
};

const webSocketConfig = 
{
    portNumber: null,
    ipAddress: null
};

let userConfig;
userConfig = JSON.parse(readFileSync(path.join(__dirname, "user_config.json"), "utf8"));
console.log("User Config Loaded!");
userConfig["computerName"] = computerName;
console.log(userConfig);

httpConfig.port = userConfig.httpPortNumber;
webSocketConfig.port = userConfig.webSocketPortNumber;

if (userConfig.WiFi == true)
{
    httpConfig.ipAddress = networkInterfaceDetails["Wi-Fi"][1]["address"];
    webSocketConfig.ipAddress = networkInterfaceDetails["Wi-Fi"][1]["address"];
}
else
{
    let networkInterfaceDetails = operatingSystem.networkInterfaces();
    httpConfig.ipAddress = networkInterfaceDetails["eth0"][1]["address"];
    webSocketConfig.ipAddress = networkInterfaceDetails["eth0"][1]["address"];
}

const server = express();    
server.use(express.json({limit: "500kb"}));
server.use(express.static(path.join(__dirname, "assets/public")));

server.listen(httpConfig.port, httpConfig.ipAddress, () => 
{
    console.log("Server listening on...");
    console.log("Port: ", httpConfig.port);
    console.log("IP: ", httpConfig.ipAddress);
});

server.get("/api/get-user-config", (request, response) =>
{
    response.json(userConfig);
    console.log("Shared User Config!");
});

server.get("/api/get-screenshot", (request, response) => 
{
    response.json(screenShotObject);
    console.log("Sharing Screenshot!");
});

let isVolumeMeterOpened = false;

server.get("/api/get-volume", (request, response) => 
{
    let currentVolumeObject = 
    {
        volume: null
    }
    if (isVolumeMeterOpened == false)
    {
        exec("sndvol.exe -f",  () => 
        {
            console.log("Opened Volume Level!");
            isVolumeMeterOpened = true;
        }); 
    }
    
    execFile(path.join(__dirname, "assets/volume_settings_win/volume_settings_win.exe"), (error, stdout, stderr) => 
    {
        currentVolumeObject.volume = stdout
        response.json(currentVolumeObject);
        console.log("Shared Current Volume!");
    }); 
    
});

server.post("/api/emulate-keys", (request, response) => 
{
    console.log(request.body);
    const keyboardInputCode = request.body.keyboardInputCode; 
    console.log(keyboardInputCode);
    execFile((path.join(__dirname, "assets/emulate_keys_win/emulate_keys_win.exe")), [keyboardInputCode], (error, stdout, stderr) => 
    {
        console.log(stdout);
        response.json("Input Emulated!");
        console.log("Input Emulated!");
    }); 
    
});

const webSocketServer = new ws.Server({port: webSocketConfig.port, host: webSocketConfig.ipAddress});

webSocketServer.on('connection', (webSocket) => 
{
    webSocket.on('message', (data) => 
    {
        let keyboardInputCode = JSON.parse(data).keyboardInputCode;
        console.log(keyboardInputCode);
        execFile((path.join(__dirname, "assets/emulate_keys_win/emulate_keys_win.exe")), [keyboardInputCode]); 
        webSocket.send("Input Emulated!");
        console.log("Input Emulated!");
    });
    
    webSocket.send('Connection Successful!');
});


screenShotObject =
{
    imgInBase64: ""
};

async function screenShotAndResize()
{
    const imgBuffer = await screenshot({format: 'png'});
    const imgBufferResized = await imageProcessor(imgBuffer).resize(265, 150).png().toBuffer(); // 265x150 resolution does
    screenShotObject.imgInBase64 = Buffer.from(imgBufferResized).toString("base64");                             // have 16x9 ratio.
    //console.log("Image Resized!");
}

setInterval(() => {screenShotAndResize()}, 300);





//const keyboardInputChar = "D"; 
//const child = execFile('.\\emulate_keyboard.exe', [keyboardInputChar]); 
//console.log("${keyboardInputChar}");
//const child = execFile('.\\emulate_keyboard.exe', [`${keyboardInputChar}`]);     // Using String Literal notation. Just an alternative. 