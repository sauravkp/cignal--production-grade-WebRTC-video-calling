const { Logger, iceServers } = require("../../config");
const logger = new Logger("Room");
const Peers = require("./Peers");
const EventEmitter = require("events").EventEmitter;

class Cignal extends EventEmitter {
  static async create({ roomId }) {
    logger.info("create() [roomId:%s]", roomId);

    const roomParticipants = new Peers();

    return new Cignal({
      roomId,
      roomParticipants,
    });
  }
  constructor({ roomId, roomParticipants }) {
    super();
    this.setMaxListeners(Infinity);
    this._roomId = roomId;
    this._participants = roomParticipants;
    this._data = {};
    logger.info("ROOM [roomId:%s] has been created", roomId);
  }

  handleSocketConnection({ peerId, peerName, socket, role }) {
    if (this._participants.peers.length > 1) {
      logger.warn(
        "handleSocketConnection() | More than 2 peers are not allowed in one room, ignoring it [peerId:%s]",
        peerId
      );
      socket.send(
        JSON.stringify({
          type: "error",
          reason: "Not allowed to join as the room already has 2 participants!",
        })
      );
      return;
    }
    let peer = this._participants.getPeer(peerId);
    if (!peer) {
      try {
        peer = this._participants.createPeer(peerId, socket);
        peer.data.displayName = peerName;
        peer.data.role = role;
        const otherPeer = this._participants.peers.filter(
          (peer) => peer.id !== peerId
        )[0];
        if (otherPeer) {
          logger.info(
            "Going to inform existing peer abpunt the newly joined peer!"
          );
          this.informPeer({ peer, otherPeer });
        } else {
          logger.warn("No other peer available yet!!");
        }
      } catch (err) {
        logger.error("Peers.createPeer() failed:%o", err);
      }
    }
    // else{
    //   peer.close();
    // }

    peer.data.available = true;

    peer.on("message", (message) => {
      logger.debug(
        'Peer "message" event [method:%s, peerId:%s]',
        message.type,
        peer.id
      );

      this._handleSocketRequest(peer, message).catch((error) => {
        logger.error("request failed:%o", error);

        // peer.reject(error);
      });
    });

    peer.on("close", () => {
      if (this._closed) return;

      logger.debug(
        'Peer "close" event [peerId:%s, noofpeers:%s]',
        peer.id,
        this._participants.peers.length
      );
      if (this._participants.peers.length === 0) {
        logger.info(
          "last Peer in the room left, closing the room [roomId:%s]",
          this._roomId
        );

        this._close();
      } else {
        let otherPeer = this._participants.peers[0];
        logger.info(
          "Informing other peer:%s about peer:%s leaving room",
          otherPeer.id,
          peer.id
        );
        otherPeer.send({
          type: "peerLeft",
          peerId: peer.id,
        });
      }
    });
  }

  async _handleSocketRequest(peer, data) {
    switch (data.type) {
      // case "login":
      //   logger.info("User name:%s,peerId:%s logged", data.name, peer.id);
      //   peer.data.displayName = data.name;

      //   break;

      case "offer":
        //for ex. UserA wants to call UserB
        logger.info("Sending offer to:%s ", data.peer);

        //if UserB exists then send him offer details
        const otherPeer = this._participants.getPeer(data.peer);

        if (otherPeer && otherPeer.connected) {
          otherPeer.send({
            type: "offer",
            offer: data.offer,
            peer: peer.id,
            name: peer.data.displayName,
            iceServers,
          });
        } else {
          peer.send({
            type: "notify",
            notification: {
              type: "danger",
              title: "Error!",
              message: "Other peer seems to be unavailable to receive offer!",
            },
          });
        }

        break;

      case "answer":
        logger.info("Sending answer to: ", data.peer);
        //for ex. UserB answers UserA
        const otherPeerAnswer = this._participants.getPeer(data.peer);
        logger.info("answer: ", data.answer);

        if (otherPeerAnswer && otherPeerAnswer.connected) {
          otherPeerAnswer.send({
            type: "answer",
            answer: data.answer,
          });
        } else {
          peer.send({
            type: "notify",
            notification: {
              type: "danger",
              title: "Error!",
              message: "Other peer seems to be unavailable to receive answer!",
            },
          });
        }

        break;

      case "candidate":
        logger.info("Sending candidate to:", data.peer);
        const otherPeerCandidate = this._participants.getPeer(data.peer);

        if (otherPeerCandidate && otherPeerCandidate.connected) {
          otherPeerCandidate.send({
            type: "candidate",
            candidate: data.candidate,
          });
        } else {
          peer.send({
            type: "notify",
            notification: {
              type: "danger",
              title: "Error!",
              message:
                "Other peer seems to be unavailable to receive ice candidates!",
            },
          });
        }

        break;

      case "leave":
        logger.info("Disconnecting from", data.name);
        const peerLeave = this._participants.getPeer(data.peer);

        //notify the other user so he can disconnect his peer connection
        if (peerLeave && peerLeave.connected) {
          peerLeave.send({
            type: "leave",
          });
        } else {
          peer.send({
            type: "notify",
            notification: {
              type: "danger",
              title: "Error!",
              message:
                "Other peer seems to be unavailable! May not be able to leave the rooms now!",
            },
          });
        }

        break;
      case "information":
        const otherPeerInfo = this._participants.getPeer(data.peer);
        if (otherPeerInfo && otherPeerInfo.connected) {
          otherPeerInfo.send(data);
        } else {
          peer.send({
            type: "notify",
            notification: {
              type: "danger",
              title: "Error!",
              message:
                "Other peer seems to be unavailable! Not able to send information. Try again later.",
            },
          });
        }

        break;
      default:
        // console.log('The message with id:', id, 'is not a special case, so Just relaying the message');
        logger.warn("Unknown message with type:%s", message.type);
        break;
    }
  }

  informPeer({ peer, otherPeer }) {
    peer.send({
      type: "login",
      details: {
        peerId: otherPeer.id,
        displayName: otherPeer.data.displayName,
      },
    });
    otherPeer.send({
      type: "login",
      details: {
        peerId: peer.id,
        displayName: peer.data.displayName,
        role: peer.data.role,
      },
    });
  }
  /**
   * Helper to get the list of joined socket peers.
   */
  _getJoinedPeers({ excludePeer = undefined } = {}) {
    return this._participants.peers.filter((peer) => peer !== excludePeer);
  }
  /**
   * Closes the Room instance by closing the all participants instance.
   */
  _close() {
    logger.debug("close()");

    this._closed = true;

    // Close the protoo Room.
    this._participants.close();
    // clearTimeout(this._disconnectedPeerTimeOut);
    // Emit 'close' event.
    this.emit("close");
  }
}

module.exports = Cignal;
