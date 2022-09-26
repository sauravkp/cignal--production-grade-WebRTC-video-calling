import { getRandomInt } from "../utils/getRandomInt.js";
import { uuidv4 } from "../utils/uuidv4.js";
import { SocketTransport } from "./SocketTransport.js";
import { iceServers } from "../utils/iceServers.js";
import { EventEmitter } from "./EventEmitter.js";
import { Logger } from "./Logger.js";
const logger = new Logger("Room");

export class Cignal extends EventEmitter {
  static async createRoom({
    url = undefined,
    roomId = undefined,
    peerId = undefined,
    peerName = undefined,
    role = "agent",
  }) {
    if (!peerId) peerId = uuidv4();
    if (!roomId) roomId = getRandomInt();
    if (!url) return { success: false, reason: "url is required!" };
    //  if (!url) return { success: false, reason: "url is required!" };
    const socket = new SocketTransport({ url, roomId, peerId, peerName });
    return new Cignal({ socket, peerId, roomId, peerName, role });
  }
  constructor({ socket, peerId, roomId, peerName, role }) {
    super();
    this._closed = false;
    this._id = roomId;
    this._socket = socket;
    this._peerConnection = null;
    this._localStream = null;
    this._remoteStream = null;
    this._data = {};
    this.prepareForCall({ peerName, peerId, role });
  }

  get data() {
    return this._data;
  }

  set data(data) {
    throw new Error("Setting the whole data object is not possible!");
  }

  get pc() {
    return this._peerConnection;
  }

  get closed() {
    return this._closed;
  }

  get socket() {
    return this._socket;
  }

  get localMedia() {
    return this._localStream;
  }

  async prepareForCall({ peerName, peerId, role }) {
    this.data.myDisplayName = peerName;
    this.data.myPeerId = peerId;
    this.data.myRole = role;
    this._socket.on("message", (data) => this.gotMessageFromServer(data));
    await this.getUserMedia();
  }
  send(msg) {
    if (this._closed) return;
    this._socket.send(msg);
  }

  async request({ type, message }) {
    const response = await this._socket.request({ type, message });
    if (response) return response;
    // else console.error("Response not received from the server side!")
  }

  gotMessageFromServer(data) {
    logger.debug("Got message:%o", data);
    //   var data = JSON.parse(message.data);

    switch (data.type) {
      case "login":
        this.handleLogin(data.details);
        break;
      //when somebody wants to call us
      case "offer":
        logger.debug("inside offer");
        this.handleOffer({
          offer: data.offer,
          peer: data.peer,
          name: data.name,
        });
        break;
      case "answer":
        logger.debug("inside answer");
        this.handleAnswer(data.answer);
        break;
      //when a remote peer sends an ice candidate to us
      case "candidate":
        logger.debug("inside handle candidate");
        this.handleCandidate(data.candidate);
        break;
      case "leave":
        this.handleLeave();
        this.emit("peerHangUp");
        break;
      case "error":
        // handleNotification(data.notification);
        this.emit("serverError", data.details);
        break;
      default:
        break;
    }
  }

  async getUserMedia() {
    logger.debug("Inside getusermedia");
    if (!this._localStream) {
      let constraints = {
        video: true,
        audio: true,
      };

      if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia(constraints)
          .then((stream) => this.getUserMediaSuccess(stream))
          .catch((error) =>
            this.clientErrorHandler({
              reason: "Error while acquiring camera/mic",
              error,
            })
          );
      } else {
        alert("Your browser does not support getUserMedia API");
      }
    } else {
      logger.debug("Local stream already acquired! Waiting for call!");
    }
  }

  getUserMediaSuccess(stream) {
    logger.debug("Inside getUserMediaSuccess");
    this._localStream = stream;
    this.emit("localStream", this._localStream);
  }

  handleLogin(data) {
    if (data) {
      logger.debug("All available users:%o", data);
      // showAllUsers.innerHTML = `Other user in room(${roomId}): ${allAvailableUsers}`;
      this.data.remoteDisplayName = data.displayName;
      this.data.remotePeerId = data.peerId;
    } else {
      // showAllUsers.innerHTML = `Other user in room(${this._id}): None`;
    }
    this.emit("peerName", this.data.remoteDisplayName);
  }

  async gotRemoteTrack(event) {
    logger.debug("inside got remote track:%O", event);
    if (event.streams && event.streams[0]) {
      logger.debug("Got a remote stream");
      this._remoteStream = event.streams[0];
    } else {
      this._remoteStream = new MediaStream();
      this._remoteStream.addTrack(event.track);
      logger.debug("Got a remote track");
    }
    this.emit("remoteStream", this._remoteStream);
  }

  async createPeerOffer() {
    let that = this;
    this._peerConnection = new RTCPeerConnection({ iceServers });
    logger.debug(
      "connection state inside createPeerOffer:%s",
      this._peerConnection.connectionState
    );
    this._peerConnection.onicecandidate = function (event) {
      logger.debug("onicecandidate inside createPeerOffer:%o", event.candidate);
      if (event.candidate) {
        that.send({
          type: "candidate",
          candidate: event.candidate,
          peer: that.data.remotePeerId,
        });
      }
    };
    this._localStream
      .getTracks()
      .forEach((track) =>
        this._peerConnection.addTrack(track, this._localStream)
      );

    this._peerConnection
      .createOffer()
      .then(function (offer) {
        return that._peerConnection.setLocalDescription(offer);
      })
      .then(function () {
        that.send({
          type: "offer",
          offer: that._peerConnection.localDescription,
          peer: that.data.remotePeerId,
        });
      })
      .catch(function (error) {
        alert("Error when creating an offer", error);
        logger.debug("Error when creating an offer", error);
      });
    this._peerConnection.ontrack = (event) => that.gotRemoteTrack(event);
  }

  async handleOffer({ peer, name, offer }) {
    let that = this;
    this._peerConnection = new RTCPeerConnection({ iceServers });
    logger.debug("Peer connection in handle offer is:%O", this._peerConnection);
    this.data.remoteDisplayName = name;
    this.data.remotePeerId = peer;
    this._peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    this._localStream
      .getTracks()
      .forEach((track) =>
        this._peerConnection.addTrack(track, this._localStream)
      );
    //create an answer to an offer
    this._peerConnection
      .createAnswer()
      .then(function (answer) {
        return that._peerConnection.setLocalDescription(answer);
      })
      .then(function () {
        that.send({
          type: "answer",
          answer: that._peerConnection.localDescription,
          peer: that.data.remotePeerId,
        });
      })
      .catch(function (error) {
        alert("Error when creating an answer");
        logger.error("Error while creating an answer:%O", error);
      });
    this._peerConnection.ontrack = (event) => that.gotRemoteTrack(event);
    this.emit("offerReceived");
  }

  handleAnswer(answer) {
    logger.debug("answer is:%O ", answer);
    this._peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  }

  handleCandidate(candidate) {
    this._peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  async handleLeave() {
    if (this._peerConnection) {
      this._peerConnection.ontrack = null;
      this._peerConnection.onremovetrack = null;
      this._peerConnection.onremovestream = null;
      this._peerConnection.onicecandidate = null;
      this._peerConnection.oniceconnectionstatechange = null;
      this._peerConnection.onsignalingstatechange = null;
      this._peerConnection.onicegatheringstatechange = null;
      this._peerConnection.onnegotiationneeded = null;

      if (this._localStream) {
        this._localStream.getTracks().forEach((track) => track.stop());
      }

      if (this._remoteStream) {
        this._remoteStream.getTracks().forEach((track) => track.stop());
      }

      this._peerConnection.close();
      this._peerConnection = null;
      this.data.remoteDisplayName = null;
      this.data.remotePeerId = null;
      this._remoteStream = null;
      this._localStream = null;
    } else {
      logger.error("No peerconnection object found!");
    }
  }

  clientErrorHandler({ reason, error }) {
    this.emit("clientError", { reason, error });
  }
}
