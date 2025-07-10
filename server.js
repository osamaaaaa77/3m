const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const WORDS = [
  "موز",
  "تفاح",
  "سيارة",
  "قلم",
  "شجرة",
  "كتاب",
  "هاتف",
  "كمبيوتر",
  "كرة",
  "طائرة",
]; // يمكنك إضافة كلمات أكثر

let players = {};
let spyId = null;
let word = null;
let hints = [];
let votes = {};
let gameStarted = false;

function chooseWord() {
  const idx = Math.floor(Math.random() * WORDS.length);
  return WORDS[idx];
}

function chooseSpy() {
  const playerIds = Object.keys(players);
  if (playerIds.length === 0) return null;
  const idx = Math.floor(Math.random() * playerIds.length);
  return playerIds[idx];
}

function resetRound() {
  hints = [];
  votes = {};
  spyId = chooseSpy();
  word = chooseWord();
  gameStarted = true;

  io.emit("start-game", { spyId, word });
}

function allHintsSubmitted() {
  return Object.keys(players).length === hints.length;
}

function allVotesSubmitted() {
  return Object.keys(players).length === Object.keys(votes).length;
}

function calculateResult() {
  const voteCount = {};
  for (const v of Object.values(votes)) {
    voteCount[v] = (voteCount[v] || 0) + 1;
  }

  let maxVotes = 0;
  let suspectedSpy = null;
  for (const playerId in voteCount) {
    if (voteCount[playerId] > maxVotes) {
      maxVotes = voteCount[playerId];
      suspectedSpy = playerId;
    }
  }

  const spyCaught = suspectedSpy === spyId;
  let message = "";

  if (spyCaught) {
    message = `✅ تم كشف العميل السري! اللاعب ${players[spyId].name} خسر الجولة.`;
  } else {
    message = `❌ العميل السري ${players[spyId].name} لم يُكشف وفاز بالجولة!`;
  }

  return { spyCaught, message };
}

io.on("connection", (socket) => {
  console.log("مستخدم جديد:", socket.id);

  socket.on("set-name", (name) => {
    players[socket.id] = { id: socket.id, name, score: 0 };
    socket.emit("connected", { id: socket.id });

    io.emit("update-players", Object.values(players)); // تحديث قائمة اللاعبين للجميع

    if (Object.keys(players).length >= 2 && !gameStarted) {
      resetRound();
    }
  });

  socket.on("submit-hint", (hint) => {
    if (!gameStarted) return;
    if (hints.find(h => h.id === socket.id)) return;

    hints.push({ id: socket.id, name: players[socket.id].name, hint });

    if (allHintsSubmitted()) {
      io.emit("show-hints", { hints, players: Object.values(players) });
    }
  });

  socket.on("vote-spy", (votedId) => {
    if (!gameStarted) return;
    if (votes[socket.id]) return;

    if (votedId === socket.id) return; // منع التصويت على نفسك

    votes[socket.id] = votedId;

    if (allVotesSubmitted()) {
      const result = calculateResult();
      io.emit("show-result", result);

      setTimeout(() => {
        resetRound();
      }, 10000);
    }
  });

  socket.on("chat-message", (msg) => {
    const player = players[socket.id];
    if (!player) return;
    io.emit("chat-message", { name: player.name, message: msg });
  });

  socket.on("disconnect", () => {
    console.log("انقطع الاتصال:", socket.id);
    delete players[socket.id];

    io.emit("update-players", Object.values(players)); // تحديث قائمة اللاعبين

    if (Object.keys(players).length < 2) {
      gameStarted = false;
      io.emit("show-result", { message: "تم إيقاف اللعبة بسبب نقص اللاعبين." });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`السيرفر يعمل على http://localhost:${PORT}`);
});
