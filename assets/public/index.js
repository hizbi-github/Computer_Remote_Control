// Computer Remote Control - 2022
// Github: @hizbi-github
// Author: Hizbullah Khan
// License: MIT

const { createApp, toRaw } = Vue;

//let appURL = window.location.href;
//let wsappurl = appURL.replace("http", "ws"); 
//console.log(appURL);
//console.log(wsappurl);
//console.log(webAppURL.hostname);
//console.log(webAppURL.port);

let webSocketClient = null;
let isWebSocketConnected = false;
let isHTTPConnected = false;
let logListLength = 0;
let maxLogListArrayLength = 50;
let imageURL = null;
let isInputSentContinuously = false;
let logListTrimmerTimerID;
let volumeTimerID;
let webSocketTimerID;
let httpTimerID;

let defaultConfig =
{
    titleText: "Remote Input",
    
    leftKeyOne: ["DISPLAY SWITCH", 37],
    leftKeyTwo: ["ENTER", 38],
    leftKeyThree: ["TAB", 40],
    leftKeyFour: ["LOCK PC", 13],
    leftKeyFive: ["WIN LEFT", 91],

    middleKeyOne: ["LEFT", 37],
    middleKeyTwo: ["UP", 38],
    middleKeyThree: ["DOWN", 40],
    middleKeyFour: ["ESCAPE", 27],
    middleKeyFive: ["WIN LEFT", 91],

    rightKeyOne: ["RIGHT", 39],
    rightKeyTwo: ["VOL +", 175],
    rightKeyThree: ["VOL -", 174],
    rightKeyFour: ["VOL MUTE", 173],
    rightKeyFive: ["ESCAPE", 27],

    connectionType: "websocket",
    screenshotStreamType: "live",
    hapticsVibrations: "on",
    darkMode: "on",

    routerWiFi: false,
    hotspotWiFi: false,
    cableLan: false,
    portNumber: 4321,
    serverName: ""
};

const rootApp = createApp({
    data() 
    {
        return {
            webAppURL: window.location.href,
            logList: "",
            logListLength: 0,
            connectDisconnectButtonText: "",
            latency: "0",
            currentVolume: "0",
            showHideScreenShotButtonText: "Hide Screen",
            imgScreenshot: "", 
            appConfig: defaultConfig,
            isOptionsButtonPressed: false
        }
    },

    mounted() 
    {
            this.mountMethod();
            console.log("Mounted");
    },

    //updated() // Can also be used instead of "nextTick()", but "updated()" is triggered for every reactive data changes...
    //{
    //    if (isWebSocketConnected == true || isHTTPConnected == true)
    //    {
    //        document.getElementById("connection-status-div-button").style.backgroundColor = "rgb(17, 179, 98)"; // GREEN color
    //        console.log("Green in updated()");
    //    }
    //    else if (isWebSocketConnected == false && isHTTPConnected == false)
    //    {
    //        document.getElementById("connection-status-div-button").style.backgroundColor = "rgb(185, 85, 85)"; // RED color
    //        console.log("Red in updated()");
    //    }
    //},

    methods: 
    {
        async mountMethod() 
        {    
            this.logList = this.logList + "<li>Waiting for Connection...</li>";
            let userConfig = await (await fetch(this.webAppURL + "api/get-user-config")).json();
            let userConfigKeys = Object.keys(userConfig);
            let defaultConfigKeys = Object.keys(defaultConfig);
            let isConfigCheckPassed = false;
            //console.log(userConfig);

            if (userConfigKeys.length != defaultConfigKeys.length) // User Config Length Check (First Check)
            {
                this.logList = this.logList + "<li>Failed to load user config...</li>";
                this.logList = this.logList + "<li>Default Config Loaded</li>";
                console.log("First Config Check Failed!");
            }
            else
            {
                for (let key=0; key<defaultConfigKeys.length; key++) // User Config Key Match Check (Second Check)
                {
                if (defaultConfigKeys[key] != userConfigKeys[key])
                {
                    console.log("Unable to load key config...");
                    this.logList = this.logList + "<li>Failed to user config...</li>";
                    this.logList = this.logList + "<li>Default Config Loaded</li>";
                    isConfigCheckPassed = false;
                    console.log("Second Config Check Failed!");
                    break;
                }
                else
                {
                    isConfigCheckPassed = true;
                }
                }
            }

            if (isConfigCheckPassed == true)
            {
                this.appConfig = userConfig;
                this.applyUserConfig();
                console.log("User Config Loaded");

                if (this.appConfig.connectionType == "websocket")
                {
                    this.connectUsingWebSocket();
                    setTimeout(() => 
                    {
                        this.getVolumeAndMuteStatusUsingWebSockets(); // Waiting for the WebSocket connection to be established.
                    }, 1000);
                }
                else if (this.appConfig.connectionType == "http")
                {
                    this.connectUsingHTTP();
                    this.getVolumeAndMuteStatusUsingHTTP();
                }
            }

            this.logListTrimmer();
        },

        applyUserConfig()
        {
            if (this.appConfig.connectionType == "websocket")
            {
                this.connectionPortTitle = "WS Port";
            }
            else if (this.appConfig.connectionType == "http")
            {
                this.connectionPortTitle = "HTTP Port";       
            }

            if (this.appConfig.darkMode == "on")
            {
                document.getElementById("body-ID").classList.remove("light-mode");
                document.getElementById("body-ID").classList.add("dark-mode");
                this.imgScreenshot = "screenshot_placeholder_dark.gif"; 
            }
            else if (this.appConfig.darkMode == "off")
            {
                document.getElementById("body-ID").classList.remove("dark-mode");
                document.getElementById("body-ID").classList.add("light-mode");     
                this.imgScreenshot = "screenshot_placeholder_light.gif"; 
            }
        },

        logListTrimmer()
        {
            logListTrimmerTimerID = setInterval(() =>
            {
                console.log("Trimming Log List...");
                let logListArray = this.logList.split(/(?=<li>)/g); // Returns an array from given string split just before "<li>" substring .
                let logListArrayLength = logListArray.length;
                let splicedLength = logListArrayLength - maxLogListArrayLength;  
                if (splicedLength > 0) // Avoiding negative indices.
                {
                    this.logList = logListArray.splice(splicedLength).join(""); // "splice(index)" returns all the elements after the given index.
                }                                                               // "join("")" combines all the strings in the array into a single string 
            }, 10000);                                                           // seperated by nothing, hence empty quotes.
        },                                                                 

        connectDisconnectFromServer()
        {
            if (isWebSocketConnected == false && this.appConfig.connectionType == "websocket")
            {
                this.connectUsingWebSocket();
            }
            else if (isWebSocketConnected == true && this.appConfig.connectionType == "websocket")
            {
                isWebSocketConnected = false;
                webSocketClient.close();
                console.log("Disconnected from WebSocket Server!");
            }

            if (isHTTPConnected == true && this.appConfig.connectionType == "http")
            {

            }
            else if (isHTTPConnected == true && this.appConfig.connectionType == "http")
            {

            }
        },

        connectUsingWebSocket() 
        {
            if (isWebSocketConnected == false)
            {
                webSocketClient = new WebSocket(this.webAppURL.replace("http", "ws") + "api/websocket");

                webSocketClient.onopen = () =>
                {
                    isWebSocketConnected = true;
                    console.log("Connected to WebSocket Server!");
                }

                webSocketClient.onclose = () =>
                {
                    if (isWebSocketConnected == true)
                    {  
                        isWebSocketConnected = false;
                        console.log("Server Closed WebSocket Connection!");
                    }
                    document.getElementById("connection-status-div-button").style.backgroundColor = "rgb(185, 85, 85)"; // RED color
                    this.logList = this.logList + "<li>" + "WebSocket: " + "Disconnected" + "</li>"; 
                    if (this.appConfig.darkMode == "on")
                    {
                        this.imgScreenshot = "screenshot_placeholder_dark.gif"; 
                    }
                    else if (this.appConfig.darkMode == "off")
                    {    
                        this.imgScreenshot = "screenshot_placeholder_light.gif"; 
                    }
                }

                webSocketClient.onmessage = (webSocketEvent) =>
                {
                    let response = JSON.parse(webSocketEvent.data);
                    //console.log(response);

                    if (response.connectionStatus != undefined)
                    {
                        let connectionStatus = response.connectionStatus;
                        document.getElementById("connection-status-div-button").style.backgroundColor = "rgb(17, 179, 98)"; // GREEN color
                        this.logList = this.logList + "<li>" + "WebSocket: " + connectionStatus + "</li>"; 
                        console.log("webSocketConnectionStatus: ", connectionStatus);
                    }
                    else if (response.responseType != undefined)
                    {
                        let responseType = response.responseType;

                        switch (responseType) {
                        case "emulateKey":
                        {
                            console.log("emulateKey: ", response.requestStatus);
                            break;
                        }

                        case "getScreenShotLive":
                        {   // Heavy optimization needed both for CPU processing and memory utilization...
                            if (response.stopRequestStatus == undefined) // Incoming PNG images are comverting to temporary blobs to stop image caching.
                            {
                                //imgInBinary = atob(response.imgInBase64); // "atob()" only deprecated in NodeJS, not in Browsers!
                                //let arrayBuffer = new ArrayBuffer(imgInBinary.length);
                                //let uIntArray = new Uint8Array(arrayBuffer);
                                //for (let index = 0; index < imgInBinary.length; index++)
                                //{
                                //    uIntArray[index] = imgInBinary.charCodeAt(index);
                                //}
                                //let imageBlob = new Blob([arrayBuffer], {type: "image/png"});
                                //let tempImageURL = URL.createObjectURL(imageBlob);
                                //this.imgScreenshot = tempImageURL; 
                                ////setTimeout(() => 
                                ////{
                                //    URL.revokeObjectURL(imageURL);
                                ////}, 1000);
                                //imageURL = tempImageURL;
                                this.imgScreenshot = "data:image/png;base64," + response.imgInBase64; 
                            }
                            else if (response.stopRequestStatus == "Success")
                            {
                                this.showHideScreenShotButtonText = "Show Screen";
                                if (this.appConfig.darkMode == "on")
                                {
                                    this.imgScreenshot = "screenshot_placeholder_dark.gif"; 
                                }
                                else if (this.appConfig.darkMode == "off")
                                {    
                                    this.imgScreenshot = "screenshot_placeholder_light.gif"; 
                                }
                            }
                            break;
                        }
                    
                        case "getScreenShotReactive":
                        {
                            this.imgScreenshot = "data:image/png;base64," + response.imgInBase64; 
                            
                            break;
                        }

                        case "getHiResScreenShot":
                        {
                            this.imgScreenshot = "data:image/png;base64," + response.imgInBase64; 
                            
                            break;
                        }

                        case "getVolumeLive":
                        {
                            this.currentVolume = response.volume;

                            break;
                        }

                        case "getVolumeReactive":
                        {
                            this.currentVolume = response.volume;
                            
                            break;
                        }
                        
                        case "getVolumeAndMuteStatus":
                        {
                            this.currentVolume = response.volume;
                            
                            break;
                        }

                        case "pingForPong":
                        {
                            
                            break;
                        }

                        default:
                            break;
                        }
                    }  
                    else
                    {
                        console.log("WebSocket Data is corrupted...");
                    }

                    //console.log("Streaming screenshots using WebSockets.");
                    //this.connectionPortNumber = this.appConfig.webSocketPortNumber;
                    //this.buttonConnectDisconnectText = "🔴 Disconnect";
                    //this.logList = this.logList + "<li>Connected!</li>"; 
                    //isWebSocketConnected = true;
                    //isInputSentContinuously = true;
                    //webSocketTimerID = setInterval(() => {this.getLatestScreenshotImgUsingWebSocket()}, 100);
                    //console.log("WS Timer ID:", webSocketTimerID);
                }
            }
            else if (isWebSocketConnected == true)
            {
                isWebSocketConnected = false;
                webSocketClient.close();
                console.log("Disconnected from WebSocket Server!");
            }
                //if (this.appConfig.hapticsVibrations == "on")
                //{
                //  navigator.vibrate(300);
                //}
                //console.log("Stopped streaming screenshots using WebSockets.");
                //this.computerName = "~";
                //this.connectionPortNumber = "~";
                //this.buttonConnectDisconnectText = "🟢 Connect";
                //this.logList = this.logList + "<li>Disconnected!</li>"; 
                //this.logList = this.logList + "<li>Waiting for Connection...</li>";
                //isWebSocketConnected = false;
                //isInputSentContinuously = false;
                //this.imgScreenshot = "<img src='waiting_for_connection_placeholder.gif'>";
                //clearInterval(webSocketTimerID);
        },

        async connectUsingHTTP() 
        {
            if (isHTTPConnected == false)
            {
                console.log("Streaming screenshots using HTTP.");
                if (this.appConfig.hapticsVibrations == "on")
                {
                navigator.vibrate([100, 100, 100]); // Vibrate for 100ms, wait for 100ms and then vibrate again for 100ms.
                }
                this.logList = this.logList + "<li>Connected!!</li>"; 
                isHTTPConnected = true;
                isInputSentContinuously = true;
                httpTimerID = setInterval(this.getLatestScreenshotImgUsingHTTP, 100);
                console.log("HTTP Timer ID:", httpTimerID);
            }
            else if (isHTTPConnected == true)
            {
                console.log("Stopped streaming screenshots using HTTP.");
                this.computerName = "";
                this.logList = this.logList + "<li>Disconnected!</li>"; 
                isHTTPConnected = false;
                isInputSentContinuously = false;
                this.imgScreenshot = "<img src='waiting_for_connection_placeholder.gif'>";
                clearInterval(httpTimerID);
            }
        },

        async getLatestScreenshotImgUsingHTTP() 
        {
            console.log("Getting Screenshot...");

            if (isHTTPConnected == true && isInputSentContinuously == true)
            {
                let response = await (await fetch(this.webAppURL + "api/get-screenshot")).json();
                //console.log(response.imgInBase64);
                this.imgScreenshot = "<img src='data:image/png;base64," + response.imgInBase64 + "'>"; 
            }

            if (this.appConfig.screenshotStreamType == "live")
            {
                isInputSentContinuously = true;
            }
            else if (this.appConfig.screenshotStreamType == "reactive")
            {
                isInputSentContinuously = false;
            }

            if (isWebSocketConnected == false && isHTTPConnected == false)
            {
                this.imgScreenshot = "<img src='waiting_for_connection_placeholder.gif'>";
            }
        },

        showHiResScreenShot ()
        {
            let request = 
            {
                requestType: "getHiResScreenShot"
            };
            webSocketClient.send(JSON.stringify(request));
        },

        showHideScreenShot ()
        {
            let request = 
            {
                requestType: "getScreenShotLive"
            };
            webSocketClient.send(JSON.stringify(request));
            this.showHideScreenShotButtonText = "Hide Screen";
        },

        async getVolumeUsingHTTP()
        {
            this.currentVolume = await (await (await fetch(this.webAppURL + "api/get-volume")).json()).volume;
        },

        async getVolumeAndMuteStatusUsingHTTP()
        {
            this.currentVolume = await (await (await fetch(this.webAppURL + "api/get-volume-and-mute-status")).json()).volume;
        },

        getVolumeLiveUsingWebSockets() 
        {
            let request = 
            {
                requestType: "getVolumeLive"
            };
            webSocketClient.send(JSON.stringify(request));
        },

        getVolumeUsingWebSockets()
        {
            let request = 
            {
                requestType: "getVolumeReactive"
            };
            webSocketClient.send(JSON.stringify(request));
        },

        getVolumeAndMuteStatusUsingWebSockets()
        {
            let request = 
            {
                requestType: "getVolumeAndMuteStatus"
            };
            webSocketClient.send(JSON.stringify(request));
        },

        async emulateKey(inputKey) 
        {
            this.logList = this.logList + "<li>‣ " + this.appConfig[inputKey][0] + "</li>";

            if (isWebSocketConnected == true)
            {
                this.sendInputUsingWebSockets(inputKey);
            }
            else if (isHTTPConnected == true)
            {
                this.sendInputUsingHTTP(inputKey);
            }
            else
            {
                this.logList = this.logList + "<li>No Connection!</li>";
            }

            if ([173, 174, 175].includes(this.appConfig[inputKey][1]) && (isWebSocketConnected == true))
            {
                if (this.appConfig[inputKey][1] == 173) // Only when sending "MUTE" input.
                {
                    this.getVolumeAndMuteStatusUsingWebSockets();
                }
                else
                {
                    this.getVolumeUsingWebSockets();
                }
            }

            if ([173, 174, 175].includes(this.appConfig[inputKey][1]) && (isHTTPConnected == true))
            {
                if (this.appConfig[inputKey][1] == 173) // Only when sending "MUTE" input.
                {
                    this.getVolumeAndMuteStatusUsingHTTP();
                }
                else
                {
                    this.getVolumeUsingHTTP();
                }
            }
        },

        async sendInputUsingWebSockets(inputKey) 
        {
            let request = 
            {
                requestType: "emulateKey",
                keyCode: this.appConfig[inputKey][1]
            };
            webSocketClient.send(JSON.stringify(request));
        },

        async sendInputUsingHTTP(inputKey) 
        {
            let payLoad = 
            {
                keyboardInputCode: this.appConfig[inputKey][1]
            };
            console.log(payLoad);

            let response = await (await fetch(this.webAppURL + "api/emulate-key", 
            {
                method: "POST", 
                body: JSON.stringify(payLoad),
                headers: 
                {
                'Content-Type': 'application/json'
                }
            })).json();
            
            console.log(response);

            if(response.requestStatus != "Success")
            {
                this.logList = this.logList + "<li>Failed 🔴</li>";
            }

            isInputSentContinuously = true;
        },

        provideHapticFeedback() 
        {
            if (this.appConfig.hapticsVibrations == "on")
            {
                navigator.vibrate(20);
            }
        },

        async renderConfigurationScreen() 
        {
            //document.getElementById("connection-status-div-button").style.backgroundColor = "rgb(17, 179, 98)"; // GREEN color
            this.isOptionsButtonPressed = true;
            await this.$nextTick(); // Wait for the reactive data to change and re-render DOM, then exceute logic below.
            if (isWebSocketConnected == true || isHTTPConnected == true)
            {
                document.getElementById("connection-status-div-button").style.backgroundColor = "rgb(17, 179, 98)"; // GREEN color
                console.log("(settings-page) nextTick(): bgToGreen");
            }
            else if (isWebSocketConnected == false && isHTTPConnected == false)
            {
                document.getElementById("connection-status-div-button").style.backgroundColor = "rgb(185, 85, 85)"; // RED color
                console.log("(settings-page) nextTick(): bgToRed");
            }
        },

        toggleConnectionType() 
        {
            if (this.appConfig.connectionType == "websocket")
            {
                if (isWebSocketConnected == true)
                {
                    clearInterval(webSocketTimerID);
                }
                this.appConfig.connectionType = "http";
                this.connectionPortTitle = "HTTP Port";
            }
            else if (this.appConfig.connectionType == "http")
            {
                if (isHTTPConnected == true)
                {
                    clearInterval(httpTimerID);
                }
                this.appConfig.connectionType = "websocket";
                this.connectionPortTitle = "WS Port";
            }
        },

        toggleScreenshotStreamType() 
        {
            if (this.appConfig.screenshotStreamType == "live")
            {
                this.appConfig.screenshotStreamType = "reactive";
            }
            else if (this.appConfig.screenshotStreamType == "reactive")
            {
                this.appConfig.screenshotStreamType = "live";
            }
        },

        toggleHapticsVibrations() 
        {
            navigator.vibrate(20);

            if (this.appConfig.hapticsVibrations == "on")
            {
                this.appConfig.hapticsVibrations = "off";
            }
            else if (this.appConfig.hapticsVibrations == "off")
            {
                this.appConfig.hapticsVibrations = "on";
            }
        },

        toggleDarkOrLightMode() 
        {
            if (this.appConfig.darkMode == "on")
            {
                this.appConfig.darkMode = "off";
                document.getElementById("body-ID").classList.remove("dark-mode");
                document.getElementById("body-ID").classList.add("light-mode");
                //if (isWebSocketConnected == false && isHTTPConnected == false)
                //{
                this.imgScreenshot = "screenshot_placeholder_light.gif"; 
                //}
            }
            else if (this.appConfig.darkMode == "off")
            {
                this.appConfig.darkMode = "on";
                document.getElementById("body-ID").classList.remove("light-mode");
                document.getElementById("body-ID").classList.add("dark-mode");
                //if (isWebSocketConnected == false && isHTTPConnected == false)
                //{
                this.imgScreenshot = "screenshot_placeholder_dark.gif"; 
                //}
            }
        },

        async backToMainScreen() 
        {
            this.isOptionsButtonPressed = false;
            await this.$nextTick(); // Wait for the reactive data to change and re-render DOM, then exceute logic below.
            if (isWebSocketConnected == true || isHTTPConnected == true)
            {
                document.getElementById("connection-status-div-button").style.backgroundColor = "rgb(17, 179, 98)"; // GREEN color
                console.log("(main-page) nextTick(): bgToGreen");
            }
            else if (isWebSocketConnected == false && isHTTPConnected == false)
            {
                document.getElementById("connection-status-div-button").style.backgroundColor = "rgb(185, 85, 85)"; // RED color
                console.log("(main-page) nextTick(): bgToRed");
            }
        }
    }
}).mount("#root-ID")






//const rightButtonTwo = document.getElementById("rightButtonTwo");

//rightButtonTwo.addEventListener("click", () =>
//{
//  const statusField = document.getElementById("statusField");

//  statusField.innerHTML++;
//});

//rightButtonTwo.addEventListener("touchend", () =>
//{
//    //rightButtonTwo.style.backgroundColor("pink");
//    //rightButtonTwo.style.backgroundColor("{pink}");
//    console.log("Touch End");
//});









