const { Logger } = require("../../config");
const SocketTransport = require("../transports/SocketTransport");
const logger = new Logger("Peers");
const Peer = require("./Peer");
const EventEmitter = require("events").EventEmitter;

class Peers extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(Infinity);
    logger.debug("constructor() Peers");
    this._closed = false;
    this._peers = new Map();
  }

  /**
   * Whether the Room is closed.
   *
   * @returns {Boolean}
   */
  get closed() {
    return this._closed;
  }

  /**
   * Get the list of conneted Peers.
   *
   * @returns {Array<Peer>}
   */
  get peers() {
    return Array.from(this._peers.values());
  }
  /**
   * Whether the Room has a Peer with given peerId.
   *
   * @returns {Booelan}
   */
  hasPeer(peerId) {
    return this._peers.has(peerId);
  }

  /**
   * Retrieve the Peer with  given peerId.
   *
   * @returns {Peer|Undefined}
   */
  getPeer(peerId) {
    return this._peers.get(peerId);
  }
  /**
   * Clsoe the Room.
   */
  close() {
    if (this._closed) return;

    logger.debug("close()");

    this._closed = true;

    // Close all Peers.
    for (const peer of this._peers.values()) {
      peer.close();
    }

    // Emit 'close' event.
    this.emit("close");
  }
  /**
   * Create a Peer.
   *
   * @param {String} peerId
   * @param {protoo.Transport} transport
   *
   * @returns {Peer}
   * @throws {TypeError} if wrong parameters.
   * @throws {Error} if Peer with same peerId already exists.
   */
  createPeer(peerId, transport) {
    logger.debug("createPeer() [peerId:%s]", peerId);

    if (!transport) throw new TypeError("no transport given");

    if (typeof peerId !== "string" || !peerId) {
      transport.close();

      throw new TypeError("peerId must be a string");
    }

    if (this._peers.has(peerId)) {
      transport.close();

      throw new Error(
        `there is already a Peer with same peerId [peerId:"${peerId}"]`
      );
    }

    const socketTransport = new SocketTransport(transport);
    const peer = new Peer(peerId, socketTransport);

    // Store it in the map.
    this._peers.set(peer.id, peer);
    peer.on("close", () => {
      this._peers.delete(peerId);
    });

    return peer;
  }
}

module.exports = Peers;
