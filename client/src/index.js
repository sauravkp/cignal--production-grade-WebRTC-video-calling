import { Cignal } from "./lib/Cignal.js";
import { getUrlParam } from "./utils/getUrlVars.js";

const role = getUrlParam("role", "agent");
const peerId = undefined;
const peerName = getUrlParam("peerName", "Agent");
const roomId = "987654321";
const url = "https://localhost:8080/";
let cignal;

document.getElementById("otherElements").hidden = true;
const usernameInput = document.querySelector("#usernameInput");
const userRoleAgent = document.querySelector("#agent");
const userRoleClient = document.querySelector("#client");
const usernameShow = document.querySelector("#showLocalUserName");
const showAllUsers = document.querySelector("#allUsers");
const remoteUsernameShow = document.querySelector("#showRemoteUserName");
const loginBtn = document.querySelector("#loginBtn");
// const callToUsernameInput = document.querySelector("#callToUsernameInput");
const callBtn = document.querySelector("#callBtn");
const hangUpBtn = document.querySelector("#hangUpBtn");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

window.addEventListener("load", async function () {
  console.log("All assets are loaded");
  console.log(window.location);

  cignal = await Cignal.createRoom({ url, peerId, roomId, peerName, role });
  console.log(cignal);
  usernameShow.innerHTML = `Hello,  ${cignal.data.myDisplayName}(${cignal.data.myRole})`;
  cignal.on("remoteStream", (remoteStream) => {
    console.log("got remote stream");
    remoteVideo.srcObject = remoteStream;
  });

  cignal.on("localStream", (localStream) => {
    console.log("got remote stream");
    localVideo.srcObject = localStream;
    document.getElementById("myName").hidden = true;
    document.getElementById("otherElements").hidden = false;
  });

  cignal.on("peerName", (name) => {
    showAllUsers.innerHTML = `Other user in cignal(${roomId}): ${name}`;
  });

  cignal.on("offerReceived", () => {
    document.getElementById("callInitiator").style.display = "none";
    document.getElementById("callOngoing").style.display = "block";
  });

  cignal.on("clientError", ({ reason, error }) => {
    alert(`${reason}`);
    console.error(error);
  });

  cignal.on("peerHangUp", () => {
    hangUp();
  });
});

/* START: Initiate call to any user i.e. send message to server */
callBtn.addEventListener("click", async function () {
  console.log("inside call button");
  if (!cignal.data.remotePeerId) {
    alert("No remote peer availabe for call!");
    return;
  }
  console.log("create an offer to-", cignal.data.remotePeerId);
  await cignal.createPeerOffer();
  document.getElementById("callOngoing").style.display = "block";
  document.getElementById("callInitiator").style.display = "none";
});

//hang up
hangUpBtn.addEventListener("click", async function () {
  cignal.send({
    type: "leave",
    peer: cignal.data.remotePeerId,
  });
  await cignal.handleLeave();
  hangUp();
});

async function hangUp() {
  usernameShow.innerHTML = "";
  showAllUsers.innerHTML = "";
  document.getElementById("myName").hidden = false;
  document.getElementById("otherElements").hidden = true;
  document.getElementById("callOngoing").style.display = "none";
  document.getElementById("callInitiator").style.display = "block";
  remoteVideo.removeAttribute("src");
  remoteVideo.removeAttribute("srcObject");
  localVideo.removeAttribute("src");
  remoteVideo.removeAttribute("srcObject");
}
