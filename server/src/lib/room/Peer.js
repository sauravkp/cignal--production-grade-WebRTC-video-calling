const { Logger } = require("../../config");
const logger = new Logger("Peer");
const EventEmitter = require("events").EventEmitter;

class Peer extends EventEmitter {
  constructor(peerId, transport) {
    super();
    this.setMaxListeners(Infinity);
    logger.debug("constructor() Peer");
    // Closed flag.
    // @type {Boolean}
    this._closed = false;

    // Peer id.
    // @type {String}
    this._id = peerId;

    // Transport.
    // @type {protoo.Transport}
    this._transport = transport;

    // Custom data object.
    // // @type {Object}
    this._data = {};
    this._connected = true;
    // Handle transport.
    this._handleTransport();
  }
  /**
   * Peer id
   *
   * @returns {String}
   */
  get id() {
    return this._id;
  }
  /**
   * connection status
   *
   * @returns {String}
   */
  get connected() {
    return this._connected;
  }
  /**
   * Whether the Peer is closed.
   *
   * @returns {Boolean}
   */
  get closed() {
    return this._closed;
  }

  /**
   * App custom data.
   *
   * @returns {Object}
   */
  get data() {
    return this._data;
  }

  /**
   * Invalid setter.
   */
  set data(
    data // eslint-disable-line no-unused-vars
  ) {
    // throw new Error("cannot override data object");
    this._data = data;
  }

  send(msg) {
    this._transport.send(msg);
  }

  notify(msg) {
    this._transport.emit("notify", msg);
  }

  /**
   * Close this Peer and its Transport.
   */
  close(code, reason) {
    if (this._closed) return;

    logger.debug("peer close()");

    this._closed = true;

    // Close Transport.
    this._transport.close(code, reason);

    this.emit("close");
  }

  _handleTransport() {
    if (this._transport.closed) {
      this._closed = true;

      setImmediate(() => this.emit("close"));

      return;
    }
    let that = this;
    this._transport.on("close", () => {
      if (that._closed) return;

      that._closed = true;

      that.emit("close");
    });

    this._transport.on("disconnect", () => {
      if (that._closed) return;

      that._connected = false;
    });

    this._transport.on("reconnected", () => {
      if (that._closed) return;

      that._connected = true;
    });

    this._transport.on("message", (message) => {
      that._handleRequest(message);
    });
  }

  _handleRequest(message) {
    try {
      logger.info("the message is:%O", message);
      this.emit("message", message);
    } catch (error) {
      logger.error(
        "error while onmessage handletransport connection:%O",
        error
      );
    }
  }
}

module.exports = Peer;
