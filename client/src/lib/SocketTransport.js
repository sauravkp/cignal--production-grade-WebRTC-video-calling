// const EventEmitter = require("eventemitter3");
// const { io } = require("socket.io-client");
import { EventEmitter } from "./EventEmitter.js";
import { Logger } from "./Logger.js";
const logger = new Logger("SocketTransport");

export class SocketTransport extends EventEmitter {
  constructor({ url, roomId, peerId, peerName, role }) {
    super();
    logger.debug("constructor():%o ", { url, roomId, peerId, peerName, role });
    this._closed = false;
    this._params = { url, roomId, peerId, peerName, role };
    this._socket = null;
    this._createSocket();
  }

  get closed() {
    return this._closed;
  }

  close() {
    if (this._closed) return;

    logger.debug("close()");

    // Don't wait for the WebSocket 'close' event, do it now.
    this._closed = true;
    this.emit("close");

    try {
      this._socket.disconnect();
    } catch (error) {
      console.error("close() | error closing the Socket", error);
    }
  }

  async send(message) {
    if (this._closed) throw new Error("transport closed");

    try {
      this._socket.send(JSON.stringify(message));
    } catch (error) {
      console.warn("send() failed", error);

      throw error;
    }
  }

  async request({ type, message }) {
    return new Promise((resolve) => {
      if (this._closed) throw new Error("transport closed");

      try {
        this._socket.emit(type, JSON.stringify(message), (response) => {
          resolve(response);
        });
      } catch (error) {
        console.warn("emit() failed:%o", error);

        throw error;
      }
    });
  }

  async _createSocket() {
    let that = this;
    const socket = io(this._params.url, {
      query: {
        roomId: this._params.roomId,
        peerId: this._params.peerId,
        peerName: this._params.peerName,
        role: this._params.role,
      },
    });
    socket.on("connect", () => {
      logger.debug("Socket connected!!");
    });
    socket.on("reconnect", () => {
      logger.debug("Socket reconnected after disconnect!!");
      socket.emit("reconnected");
    });
    socket.on("message", (message) => {
      const parsedMessage = JSON.parse(message);
      logger.debug("New mesage received with id:%o", parsedMessage.type);
      that.emit("message", parsedMessage);
    });
    this._socket = socket;
  }
}
