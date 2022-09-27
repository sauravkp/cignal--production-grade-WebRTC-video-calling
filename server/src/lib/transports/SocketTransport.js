const { Logger, iceServers, customIceServers } = require("../../config");
const logger = new Logger("SocketTransport");
const EventEmitter = require("events").EventEmitter;

class SocketTransport extends EventEmitter {
  constructor(socket) {
    super();
    this.setMaxListeners(Infinity);
    logger.debug("constructor() SocketTransport");
    // Closed flag.
    // @type {Boolean}
    this._closed = false;
    this._socket = socket;
    this._handleConnection();
  }

  get closed() {
    return this._closed;
  }

  close(code = 4500, reason = "closed by Signalling Server") {
    if (this._closed) return;

    logger.debug("close() [conn:%s]", this);

    // Don't wait for the WebSocket 'close' event, do it now.
    this._closed = true;

    // this.emit("close");

    try {
      this._socket.disconnect();
    } catch (error) {
      logger.error("close() | error closing the connection: %s", error);
    }
  }

  send(message) {
    if (this._closed) throw new Error("transport closed");
    logger.info("Going to send message", message);
    try {
      this._socket.send(JSON.stringify(message));
    } catch (error) {
      logger.warn("send() failed:%o", error);

      throw error;
    }
  }

  _handleConnection() {
    let sessionId = this._socket.id;
    let that = this;
    this._socket.on("error", function (error) {
      logger.info("Connection " + sessionId + " error");
      that.emit("error");
    });
    // this._socket.on("close", function () {
    //   logger.info("Connection " + sessionId + " closed");
    //   that.emit("close");
    // });
    this._socket.on("disconnect", (reason) => {
      logger.info(
        "Socket client disconnected-" + sessionId + "with reason" + reason
      );
      if (reason === "ping timeout") that.emit("disconnect");
      else that.emit("close");
    });
    this._socket.on("fetchIceServers", (arg, callback) => {
      logger.info("fetched ice servers:%o", iceServers);
      let selectedIceServers =
        customIceServers.length > 0 ? customIceServers : iceServers;
      callback(selectedIceServers);
    });
    this._socket.on("setIceServers", (arg, callback) => {
      logger.info("set ice servers:%O", JSON.parse(arg));
      let iceServersFromClient = JSON.parse(arg);
      iceServersFromClient.forEach((element) => customIceServers.push(element));
      logger.info(" custom ice servers:%o", customIceServers);
      callback(customIceServers);
    });
    this._socket.on("reconnected", () => {
      that.emit("reconnected");
    });
    this._socket.on("message", async function (_message) {
      var message = JSON.parse(_message);
      logger.info(
        "Connection " + sessionId + " received message type:%s ",
        message.type
      );
      that.emit("message", message);
    });
  }
}

module.exports = SocketTransport;
