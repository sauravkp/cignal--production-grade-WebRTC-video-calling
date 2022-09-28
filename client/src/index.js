import { Cignal } from "./lib/Cignal.js";
import { getUrlParam } from "./utils/getUrlVars.js";
import { Logger } from "./lib/Logger.js";
const logger = new Logger("index");
let peerNamePrompt = window.prompt("What's your name?", "Peer");
const peerId = undefined;
const peerName = peerNamePrompt === null ? "Peer" : peerNamePrompt;
const roomId = getUrlParam("roomId", null);
const url = `https://${window.location.host}/`;
const mediaConstraints = {
  audio: true,
  video: {
    width: { min: 320, ideal: 1280, max: 1280 },
    height: { min: 240, ideal: 720, max: 720 },
    aspectRatio: 1.777777778,
    frameRate: { min: 15, max: 30 },
  },
};
let cignal;

document.getElementById("otherElements").hidden = true;
const usernameShow = document.querySelector("#showLocalUserName");
const showAllUsers = document.querySelector("#allUsers");
const remoteUsernameShow = document.querySelector("#showRemoteUserName");
const callBtn = document.querySelector("#callBtn");
const hangUpBtn = document.querySelector("#hangUpBtn");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const copyBtn = document.querySelector("#copyBtn");
const informPeerBtn = document.querySelector("#informPeerBtn");

window.addEventListener("load", async function () {
  logger.debug("All assets are loaded");
  logger.debug(window.location);

  cignal = await Cignal.createRoom({
    url,
    peerId,
    roomId,
    peerName,
    mediaConstraints,
  });
  logger.debug("cignal is:%O", cignal);
  usernameShow.innerHTML = `Hello,  ${cignal.data.myDisplayName}`;
  cignal.on("remoteStream", (remoteStream) => {
    logger.debug("got remote stream");
    remoteVideo.srcObject = remoteStream;
    remoteUsernameShow.innerHTML = cignal.data.remoteDisplayName;
  });

  cignal.on("localStream", (localStream) => {
    logger.debug("got local stream");
    localVideo.srcObject = localStream;
    // document.getElementById("myName").hidden = true;
    document.getElementById("otherElements").hidden = false;

    document.getElementById("clientLinkHelperText").hidden = true;
    if (!roomId) {
      showAllUsers.innerHTML = `Other user in cignal room(${cignal.id}): None`;
      document.getElementById("clientLink").style.display = "flex";
      const clientLink = `${url}?roomId=${cignal.id}`;
      document.getElementById("clientLinkToCopy").innerHTML = clientLink;
    }
  });

  cignal.on("peerJoined", (name) => {
    showAllUsers.innerHTML = `Other user in cignal room(${cignal.id}): ${name}`;
  });

  cignal.on("offerReceived", () => {
    document.getElementById("callInitiator").style.display = "none";
    document.getElementById("callOngoing").style.display = "block";
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
    hangUp();
  });
  cignal.on("information", (data) => {
    alert(`Message received from peer is-: ${data.chatMessage} `);
    logger.debug("Message received from peer is:%o", data.chatMessage);
    // this can be used for any arbitrary data transfer like chatmessages, audio mute / unmute messages etc.
  });
});

/* START: Initiate call to any user i.e. send message to server */
callBtn.addEventListener("click", async function () {
  logger.debug("inside call button");

  let res = await cignal.joinRoom();
  if (res.success) {
    document.getElementById("callOngoing").style.display = "block";
    document.getElementById("callInitiator").style.display = "none";
    document.getElementById("clientLink").style.display = "none";
  }
});
copyBtn.addEventListener("click", async () => {
  logger.debug("inside copy button");
  cignal.copyLink(`${url}?roomId=${cignal.id}`);
});
//hang up
hangUpBtn.addEventListener("click", async function () {
  let res = await cignal.leaveRoom();
  if (res.success) hangUp();
});

informPeerBtn.addEventListener("click", async () => {
  logger.debug("inside inform peer button");
  cignal.inform({ chatMessage: "Hello world!" });
});

async function hangUp() {
  usernameShow.innerHTML = "";
  showAllUsers.innerHTML = "";
  // document.getElementById("myName").hidden = false;
  document.getElementById("otherElements").hidden = true;
  document.getElementById("callOngoing").style.display = "none";
  document.getElementById("allUsers").style.display = "none";
  document.getElementById("clientLink").style.display = "none";
  document.getElementById("callInitiator").style.display = "block";
  document.getElementById("thankYou").style.display = "flex";
  remoteVideo.removeAttribute("src");
  remoteVideo.removeAttribute("srcObject");
  localVideo.removeAttribute("src");
  remoteVideo.removeAttribute("srcObject");
}
