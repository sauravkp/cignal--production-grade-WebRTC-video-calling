const { Logger, show } = require("../config");
const logger = new Logger("socketServer");
const { Cignal } = require("./room");
const { AwaitQueue } = require("awaitqueue");

const queue = new AwaitQueue();
const store = new Map();

const initSocketServer = (io) => {
  io.on("connection", (socket) => {
    let sessionId = socket.id;
    let query = socket.handshake.query;
    logger.info("New Socket client connected-:%s,query:%o", sessionId, query);
    let { roomId, peerId, peerName, role } = query;

    queue
      .push(async () => {
        const room = await getOrCreate({ roomId });
        logger.info("b4 instantiating websocket transport!!");

        room.handleSocketConnection({ peerId, peerName, socket, role });
      })
      .catch((error) => {
        logger.error("room creation or room joining failed:%o", error);
        show.error("room creation or room joining failed", error);
      });
  });
};

async function getOrCreate({ roomId }) {
  let room = store.get(roomId);

  if (!room) {
    logger.info("creating a new Room [roomId:%s]", roomId);
    room = await Cignal.create({ roomId });
    store.set(roomId, room);
    room.on("close", () => store.delete(roomId));
  }

  return room;
}

async function totalRoomsRunning() {
  return Array.from(store.keys()).length;
}

async function allRooms() {
  return Array.from(store.values());
}

module.exports = { initSocketServer, totalRoomsRunning, allRooms };
