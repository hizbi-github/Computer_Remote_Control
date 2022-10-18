// Computer Remote Control - 2022
// Github: @hizbi-github
// Author: Hizbullah Khan
// License: MIT

// Build command for Win_x64 executable file:
// npx caxa --input "." --output "Presenter_Keys.exe" -- "{{caxa}}/node_modules/.bin/node" "{{caxa}}/server.js"

// To display projection window, run "DisplaySwitch.exe" from command line...

const hyperExpress = require("hyper-express");
const screenshot = require("screenshot-desktop");
const imageProcessor = require("images");
const operatingSystem = require("os");
const { readFileSync } = require("fs");
const { exec, execFile } = require("child_process");
const path = require("path");

const currentProcessDir = process.cwd();
const currentWorkingDir = __dirname;

let networkInterfaceDetails = operatingSystem.networkInterfaces();
let serverName = operatingSystem.hostname();

console.log("");
console.log("--> Computer Remote Control - 2022");
console.log('--> Source code available at "github.com/hizbi-github"');
console.log('--> For virtual key-codes, visit "learn.microsoft.com/en-us/windows/win32/inputdev/virtual-key-codes"');

const serverConfig = 
{
    portNumber: null,
    ipAddress: null
};

let userConfig;
try
{
    userConfig = JSON.parse(readFileSync(path.join(currentProcessDir, "user_config.json"), "utf8"));
    console.log("");
    console.log("--- User Config Loaded!");
    console.log("");
}
catch(error)
{
    console.log("");
    console.log('--> "user_config.json" file not found.');
    console.log("--> Please place it in the same directory next to the executable!");

    userConfig = JSON.parse(readFileSync(path.join(currentWorkingDir, "default_user_config.json"), "utf8"));
    console.log("");
    console.log("--- Starting with default configurations...");
    console.log("");
}
userConfig["serverName"] = serverName;
//console.log(userConfig);

//console.log(networkInterfaceDetails);

serverConfig.port = userConfig.portNumber;

if (userConfig.routerWiFi == true)
{
    serverConfig.ipAddress = networkInterfaceDetails["Wi-Fi"][1]["address"];
    console.log("--- Using Router's WiFi...");
    console.log("");
}
else if (userConfig.hotspotWiFi == true)
{
    serverConfig.ipAddress = networkInterfaceDetails["Local Area Connection* 2"][1]["address"];
    console.log("--- Using Laptop's WiFi Hotspot...");
    console.log("");
}
else if (userConfig.lanCable == true)
{
    serverConfig.ipAddress = networkInterfaceDetails["eth0"][1]["address"];
    console.log("--- Using Lan/Ethernet Cable...");
    console.log("");
}

const server = new hyperExpress.Server();

async function startServer()
{
    await server.listen(serverConfig.port, serverConfig.ipAddress);
    console.log("--- Server is LIVE! ");
    console.log("");
    console.log("--> Please use the link below in your phone's browser to access the webapp:");
    console.log("");
    console.log(`--- http://${serverConfig.ipAddress}:${serverConfig.port} ---`);
    console.log("");
}

try
{
    startServer();
    screenShotAndResize(); // Calling it in the beginning just to fill the image buffer...
}
catch(error)
{
    throw new Error (error); // Confirm this...
}

server.get("/", (request, response) =>
{
    response.file(path.join(currentWorkingDir, "assets/public/index.html"));
    console.log("Client Connected!");
    console.log("Shared HTML!");
});

server.get("/configuration_icon.png", (request, response) =>
{
    response.file(path.join(currentWorkingDir, "assets/public/configuration_icon.png"));
    console.log("Client Connected!");
    console.log("Shared Settings Icon!");
});

server.get("/styles.css", (request, response) =>
{
    response.file(path.join(currentWorkingDir, "assets/public/styles.css"));
    console.log("Shared Styles!");
});

server.get("/screenshot_placeholder_dark.gif", (request, response) =>
{
    response.file(path.join(currentWorkingDir, "assets/public/screenshot_placeholder_dark.gif"));
    console.log("Shared GIF!");
});

server.get("/screenshot_placeholder_light.gif", (request, response) =>
{
    response.file(path.join(currentWorkingDir, "assets/public/screenshot_placeholder_light.gif"));
    console.log("Shared GIF!");
});

server.get("/vue.global.prod.js", (request, response) =>
{
    response.file(path.join(currentWorkingDir, "assets/public/vue.global.prod.js"));
    console.log("Shared Vue.js!");
});

server.get("/index.js", (request, response) =>
{
    response.file(path.join(currentWorkingDir, "assets/public/index.js"));
    console.log("Shared Index.js!");
});

server.get("/api/get-user-config", (request, response) =>
{
    response.json(userConfig);
    console.log("Shared User Config!");
});

server.get("/favicon.ico", (request, response) =>
{
    response.status(204).send();
    console.log("Did Not Share Favicon!");
});

server.post("/api/emulate-key", async (request, response) => 
{
    //console.log(request.body);
    const keyboardInputCode = await (await request.json()).keyboardInputCode; 
    execFile((path.join(currentWorkingDir, "assets/emulate_keys_win/emulate_keys_win.exe")), [keyboardInputCode], (error, stdout, stderr) => 
    {
        let responseToClient = 
        {
            requestStatus: stdout
        };
        response.json(responseToClient);
        console.log(responseToClient);
        console.log(`Input Code ${keyboardInputCode} Emulated!`);
    }); 
    
});

server.get("/api/get-screenshot", (request, response) => 
{
    response.json(screenShotObject);
    console.log("Sharing Screenshot!");
});

server.get("/api/get-hi-res-screenshot", (request, response) => 
{
    response.json(screenShotObject);
    console.log("Sharing Screenshot!");
});

server.get("/api/get-volume", (request, response) => 
{
    execFile(path.join(currentWorkingDir, "assets/volume_settings_win/volume_settings_win.exe"), (error, stdout, stderr) => 
    {
        let volumeObject = 
        {
            volume: stdout
        }        
        response.json(volumeObject);
        console.log("Shared Current Volume!");
    }); 
});

server.get("/api/get-volume-and-mute-status", (request, response) => 
{
    execFile(path.join(currentWorkingDir, "assets/volume_settings_win/SetVol.exe"), ["report"], (error, stdout, stderr) => 
    {
        let volumeString = getVolumeFromStdOutOfSetVol(stdout);
        let volumeObject = 
        {
            volume: volumeString
        }        
        response.json(volumeObject);
        console.log("Shared Volume Mute Status!");
    }); 
});

let isScreenShotOverWebSocketRequested = false;
let isVolumeOverWebsocketRequested = false;
let screenShotAndResizeTimerID = null;
let webSocketScreenShotTimerID = null;
let webSocketVolumeTimerID = null;

server.ws("/api/websocket", (webSocket) => 
{
    let response =
    {
        connectionStatus: "Success"
    }
    webSocket.send(JSON.stringify(response));
    console.log("Client upgraded to WebSocket!");
    
    webSocket.on('message', (data) => 
    {
        let requestType = JSON.parse(data).requestType;

        switch (requestType) 
        {
            case "emulateKey":
            {
                let keyCode = JSON.parse(data).keyCode;
                execFile((path.join(currentWorkingDir, "assets/emulate_keys_win/emulate_keys_win.exe")), [keyCode], (error, stdout, stderr) => 
                {
                    let response = 
                    {
                        responseType: requestType,
                        requestStatus: stdout
                    };
                    webSocket.send(JSON.stringify(response));
                    console.log("emulateKey: ", keyCode, " ", stdout);
                }); 
                break;
            }

            case "getScreenShotLive":
            {
                if (isScreenShotOverWebSocketRequested == false)
                {
                    isScreenShotOverWebSocketRequested = true;
                    screenShotAndResizeTimerID = setInterval(screenShotAndResize, 150);
                    webSocketScreenShotTimerID = setInterval(() => 
                    {
                        let response = 
                        {
                            responseType: requestType,
                            imgInBase64: screenShotObject.imgInBase64
                        };
                        webSocket.send(JSON.stringify(response)); 
                    }, 100);
                    console.log("getScreenShotLive: Enabled");
                }
                else
                {
                    isScreenShotOverWebSocketRequested = false;
                    clearInterval(screenShotAndResizeTimerID);
                    clearInterval(webSocketScreenShotTimerID);
                    let response = 
                    {
                        responseType: requestType,
                        stopRequestStatus: "Success"
                    };
                    webSocket.send(JSON.stringify(response)); 
                    console.log("getScreenShotLive: Disabled");
                }
                
                break;
            }

            case "getScreenShotReactive":
            {
                let response = 
                {
                    responseType: requestType,
                    imgInBase64: screenShotObject.imgInBase64
                };
                webSocket.send(JSON.stringify(response)); 
                console.log("getScreenShotReactive: Success");
                break;
            }

            case "getHiResScreenShot":
            {
                let response = 
                {
                    responseType: requestType,
                    imgInBase64: screenShotObject.imgInBase64
                };
                webSocket.send(JSON.stringify(response)); 
                console.log("getHiResScreenShot: Success");
                break;
            }
            
            case "getVolumeLive":
            {
                if (isVolumeOverWebsocketRequested == false)
                {
                    isVolumeOverWebsocketRequested = true;
                    webSocketVolumeTimerID = setInterval(() => 
                    {
                        execFile(path.join(currentWorkingDir, "assets/volume_settings_win/SetVol.exe"), ["report"], (error, stdout, stderr) => 
                        {
                            let volumeString = getVolumeFromStdOutOfSetVol(stdout);
                            let response = 
                            {
                                responseType: requestType,
                                volume: volumeString
                            };
                            webSocket.send(JSON.stringify(response)); 
                        }); 
                    }, 10000);
                    console.log("getVolumeLive: Enabled");
                }
                else
                {
                    isVolumeOverWebsocketRequested = false;
                    clearInterval(webSocketVolumeTimerID);
                    let response = 
                    {
                        responseType: requestType,
                        stopRequestStatus: "Success"
                    };
                    webSocket.send(JSON.stringify(response)); 
                    console.log("getVolumeLive: Disabled");
                }
                
                break;
            }

            case "getVolumeReactive":
            {
                execFile(path.join(currentWorkingDir, "assets/volume_settings_win/volume_settings_win.exe"), (error, stdout, stderr) => 
                {
                    let response = 
                    {
                        responseType: requestType,
                        volume: stdout
                    };
                    webSocket.send(JSON.stringify(response)); 
                    console.log("getVolumeReactive: Success");
                }); 
                break;
            }

            case "getVolumeAndMuteStatus": 
            {
                execFile(path.join(currentWorkingDir, "assets/volume_settings_win/SetVol.exe"), ["report"], (error, stdout, stderr) => 
                {
                    let volumeString = getVolumeFromStdOutOfSetVol(stdout);
                    let response = 
                    {
                        responseType: requestType,
                        volume: volumeString
                    };
                    webSocket.send(JSON.stringify(response)); 
                    console.log("getVolumeAndMuteStatus: Success");
                }); 
                break;
            }

            case "pongToPing":
            {
                let response = 
                {
                    responseType: "pingForPong",
                    pingtimeStamp: JSON.parse(data).pingtimeStamp,
                };
                webSocket.send(JSON.stringify(response)); 
                console.log("pongToPing: Success");
                break;
            }
                
            default:
                break;
        }
        
        
    });
});

screenShotObject =
{
    imgInBase64: ""
};

async function screenShotAndResize()
{
    const imgBuffer = await screenshot({format: 'png'});
    //const imgBufferResized = imageProcessor(imgBuffer).encode("png"); // Full Screen Resolution Screenshot
    const imgBufferResized = imageProcessor(imgBuffer).resize(265, 150).encode("png"); // 265x150 resolution does
    screenShotObject.imgInBase64 = Buffer.from(imgBufferResized).toString("base64");   // have 16x9 ratio.
}

function getVolumeFromStdOutOfSetVol(stdout)
{
    let stdOutString = stdout.toString();
    let positionOfFirstEqualSign = stdOutString.indexOf("="); // "SetVol" outputs volume after "=" sign and a space.
    let volumeString = `${stdOutString[positionOfFirstEqualSign + 2]}${stdOutString[positionOfFirstEqualSign + 3]}`;

    if (stdOutString.includes("Muted"))
    {
        volumeString = volumeString + " ⛔";
    }

    return(volumeString);
}

//let screenShotAndResizeTimerID = setInterval(screenShotAndResize, 150);








//const imgBufferResized = await imageProcessor(imgBuffer).resize(265, 150).png().toBuffer(); // 265x150 resolution does
                                                                                              // have 16x9 ratio.

//const keyboardInputChar = "D"; 
//const child = execFile('.\\emulate_keyboard.exe', [keyboardInputChar]); 
//console.log("${keyboardInputChar}");
//const child = execFile('.\\emulate_keyboard.exe', [`${keyboardInputChar}`]);     // Using String Literal notation. Just an alternative. 