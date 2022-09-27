# Cignal WebRTC signalling server

A minimalistic WebRTC signalling server written in Nodejs with Socket.io. It currently supports p2p video calling only. It has 2 parts, Server and Client. Each of these individual parts has been described below in details. Any team can follow this documentation for effective implementation of both the client and server side libraries. Please don't change the core of the libraries (both client and server) without proper understanding. You can extend the capabilities of the libraries by creating new functionality in your own custom files but not in the library files.

## Running the application

Make sure that you have NodeJs 12+ installed in your machine before proceeding with rest of the instructions. If you don't have Nodejs installed yet, please visit official Nodejs website to download Nodejs. This application has been developed using Nodejs 16 LTS.

Clone the repo in your local machine and install the necessary dependencies to run the application. If you are on Linux, you can do so by
`cd <folder-name>`
` yarn install / npm install`

Once all dependencies are successfully installed, run the server by using this command if you want to view the server logs

`yarn run devwithdebug`

Run the server with below command if you don't want any server side logs (May be in production!).

`yarn run dev`

Once the server is successfully running without any errors, visit the below links for accessing the application.

- To start a room: `https://localhost:8080/`
- To join a room with a link: `https://localhost:8080/?roomId=1234567890`

## Server

The server side of the application has been designed in a modular way and needs minimal to very minimal changing for integrating to other application. All the server related code files are there in the Server folder.

Below are the modules required for server to work properly. Install them with below mentioned command.

`yarn add / npm install awaitqueue dotenv debug socket.io winston`

In order to integrate the server in your own application, copy the below mentioned folders and paste it in your application codebase.
`/server/src/config`
`/server/src/lib`
`/server/.env`
Import the below 2 modules inside your main server code file.

`const { initSocketServer } = require("../lib");`
`const { Server } = require("socket.io");`

Once done, paste the below mentioned lines in your main server code file i.e. where the https node server is created, after the line where server object is created. The below line needs the server object to create the socket server on top of it.

`const io = new Server(server, {});`
`initSocketServer(io);`

Two additional functions are available in lib to know the total number of rooms currently running and the details of each individual room.

`const { totalRoomsRunning, allRooms } = require("../lib");`

To get the total number of rooms currently running, call 'await totalRoomsRunning()'. This will return a number which is the count of total number of rooms currently running.

To get the details of rooms currently running, call 'await allRooms()'. This will return an array of room objects currently running. You can loop through it to access all the rooms.

## Client

Like the Server, the client side also have been designed in a modular way on the lines of a event based approach. For all the important client side activities, an event is created on the main room object which the developer needs to listen to implement UI level manipulations. All the important events have been noted down below which are already available in the client side.

In order to integrate the client side, copy the client folder to your applications and make necessary changes in the main index.js file according to your requirement.

The most important component of the client side is the Cignal class which needs to be instantiated in the index.js file on load of the document. The Cignal class need to imported into the index.js file as mentioned below. The second import of getURLParam is needed if you wish to read parameters provided in the URL field. The 3rd and 4th lines are for using the client side debug logger in the index.js file.

```
import { Cignal } from "./lib/Cignal.js";
import { getUrlParam } from "./utils/getUrlVars.js";
import { Logger } from "./lib/Logger.js";
const logger = new Logger("index");
```

Client side logging is disabled by default for the library. If you want to enable it, execute the below mentioned command in the browser console.

`localStorage.debug='cignal-client:*';`

Refresh the page after executing the above command and you should be able to see the logs for the library now.

Below is an example with detailed explanation on a way to instantitate the Cignal class in to an object and listen to the listeners for various data parameters.

The below parameters are needed to instantitate the room object.

`url` of the socket server.This will usually be the same as the application server. In that case, you can use the below codeblock as the url.
`https://${window.location.host}/` else you need to pass the url where the server side of this app is running. The default url if url parameter is not provided is `window.location.href`.

`peerId` is an important paramter on which the server side data structure depends. Be sure to supply it with a unique value while instantiating Cignal. If you don't supply anything, the cignal object will automatically generate a 10 digit alphanumeric text as peerId and use it.

`roomId` is the most important paramter on which the server side data structure depends completely. This value needs to be unique as the server side data structure creates unique keys based on the `roomId`. `roomId` parameter should never be duplicated as it will corrupt the server side data structure. Two peers need to be in the same room i.e. have the same `roomId` to join a call. Be very careful about this.

`role` is an optional field. This is there to make ui level changes based on the role. The roles can be teacher / student or agent / client or doctor / patient etc.

`peerName` is the other field. It has no functional importance.It is needed for displaying the name. If no value is supplied it will take the role name as the name of the user. If role name is not there then it will be "Peer".

`getUrlParam(key,default_value)` function takes 2 parameters. 1st one is the key name to read from the url and the second is the default value in case that key is not available in the url.

```
const peerId = undefined;
const peerName = window.prompt("What's your name?", "Peer");
const roomId = getUrlParam("roomId", null);
const url = `https://${window.location.host}/`;
let cignal;

window.addEventListener("load", async function () {
  logger.debug("All assets are loaded");
  logger.debug(window.location);

  cignal = await Cignal.createRoom({ url, peerId, roomId, peerName});
  logger.debug("cignal is:%O", cignal);

  cignal.on("remoteStream", (remoteStream) => {
    logger.debug("got remote stream");
    remoteVideo.srcObject = remoteStream;
  });

  cignal.on("localStream", (localStream) => {
    logger.debug("got remote stream");
    localVideo.srcObject = localStream;
    <!-- here localVideo refers to the video html element already created -->
  });

  cignal.on("peerJoined", (name) => {
    <!-- when other peer joins the room, can be used for ui manipulations to inform the caller that the other peer is now available and the call can be started -->
  });

  cignal.on("offerReceived", () => {
    <!-- when sdp offer is received from the other side, can be used for ui manipulations / other application logic -->
  });

  cignal.on("clientError", ({ reason, error }) => {
    alert(`${reason}`);
    logger.debug("Client side error:%O", error);
  });

  cignal.on("serverError", ({ reason, error }) => {
    alert(`${reason.message}`);
    logger.debug("Server side error:%O", error);
  });

  cignal.on("peerHangUp", () => {
    <!-- when the other peer leaves the room. used for ui level manipulation to reset the ui to the initial state / other application logic like rerouting to another page once call is over. -->
  });

  cignal.on("information", (data) => {
    alert(`Message received from peer is-: ${data.chatMessage} `);
    logger.debug("Message received from peer is:%o", data.chatMessage);
    <!-- This can be used for any arbitrary data transfer like chatmessages, audio mute / unmute messages etc. -->
  });
});
```

Below are the functionaities available in the room object.

`cignal.joinRoom()` is the function to initiate the call. This function can be called only after 2 peers are available inside a room. If only one peer is available it will throw an client side error and returns `success` false.

`cignal.copyLink(`\`${url}?roomId=${cignal.id}\`)` is the function to copy the link and send it to somebody else for joining a room. This function is only needed on the side of the peer who is initiating the call.

`cignal.leaveRoom()` is the function to leave the room. This will reset all WebRTC related parameters. This fuction is called when hangup button is clicked in the demo application. `hangUp()` which performs ui level changes in the demo application. You need do your ui level changes to end a call by using a similar function.

`cignal.inform()` is a general purpose function designed to send any kind of messages to the other peer currently joined the room. An example will be to build a chat functionality using this. An example message will look like `cignal.inform({ chatMessage: "Hello world!" })`; This even can be listened on the other peer side using the event listener `cignal.on("information", (data) => { <do something here with the received information> })`

Available data fields on the cignal object are as below.

'cignal.pc' : The WebRTC peerconnection object used for call. Default `null`.

'cignal.id' : The unique id for this signal. It has the value of roomId which is passed at the time of instantiating the cignal object.

'cignal.closed' : The state of cignal. Default `false`. Once the call is ended, this value is updated to `true`.

`cignal.socket` : The underlying socket connection responsible for carrying message from the browser client to the server and maintaining the connection throughout the lifetime of the call.

`cignal.localMedia` : The mediastream object acquired by calling successfully the `getUserMedia` WebRTC api.

`cignal.data` : The client side variable store for storing the details like peerIds, displaynames and anything else you need for your application logic.

`cignal.data.myPeerId` : The unique peerId of the call initiator.

`cignal.data.myDisplayName` : The display name of the call initiator.

`cignal.data.myRole` : The role of the call initiator, default `undefined`.

`cignal.data.remotePeerId` : The unique peerId of the call receiver.

`cignal.data.remoteDisplayName' : The display name of the call receiver.

`cignal.data.remoteRole` : The role of the call receiver, default `undefined`.

## Hosting cignal on a cloud

Hosting the app on a cloud like digitalocean to use it from the internet, will be added in this section soon.

## cignal-server npm module

cignal-server wil be available in the npm registry within a couple of weeks time for easing the process of integration with other node apps.

## cignal-client-js & cignal-client-react

cignal-client side libraries will be created after the stable version of cignal-server is made available in npm registry. Contributions are most welcome in this area.

## Features in pipeline

1. Support for WebRTC data channels
2. On-demand mute/unmute
3. On-demand camera on/off
4. Client side display of realtime Network status
5. On-demand ICE restarts to recover from network failures

Drop a mail to `support@centedge.io` for additional feature requests/ support requests with existing features / bug fixes.

## Production grade video calling

Cignal is a community edition WebRTC signalling server sponsored by [Centedge](https://centedge.io). Cp2p is a feature rich production grade video calling app with enterprise grade support by the same company. More details about Cp2p can be found out [here](https://www.centedge.io/products-cp2p-webrtc-p2p-video-calling).

## Licence

MIT
