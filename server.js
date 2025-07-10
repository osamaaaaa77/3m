const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

let players = [];
let hints = [];
let spyId = null;
let word = "";
let roundStarted = false;

const words = [
  "مكتبة", "سيارة", "تفاحة", "هاتف", "نهر", "قمر", "قطار", "مستشفى", "كرسي", "شباك"
];

function startGame() {
  if (players.length < 3) {
    io.emit("chat-message", { name: "النظام", message: "⚠️ اللعبة تحتاج 3 لاعبين على الأقل لبدء الجولة." });
    return;
  }

  hints = [];
  roundStarted = true;

  const randomIndex = Math.floor(Math.random() * players.length);
  spyId = players[randomIndex].id;

  word = words[Math.floor(Math.random() * words.length)];

  io.emit("start-game", {
    spyId,
    word,
  });
}

function endRound() {
  const votes = {};

  players.forEach(p => {
    p.vote && (votes[p.vote] = (votes[p.vote] || 0) + 1);
  });

  let maxVotes = 0;
  let votedOutId = null;

  for (const id in votes) {
    if (votes[id] > maxVotes) {
      maxVotes = votes[id];
      votedOutId = id;
    }
  }

  let message = "";
  if (votedOutId === spyId) {
    const spyName = players.find(p => p.id === spyId)?.name || "العميل";
    message = `🎉 تم كشف العميل (${spyName})!`;
  } else {
    const realSpyName = players.find(p => p.id === spyId)?.name || "العميل";
    message = `😈 فشلتم في كشف العميل! العميل كان: ${realSpyName}`;
  }

  io.emit("show-result", { message });

  players.forEach(p => {
    p.vote = null;
  });

  setTimeout(() => {
    roundStarted = false;
    startGame();
  }, 5000);
}

io.on("connection", (socket) => {
  console.log("مستخدم متصل:", socket.id);

  socket.on("set-name", (name) => {
    players.push({ id: socket.id, name, vote: null });
    socket.emit("connected", { id: socket.id });
    io.emit("update-players", players);
    if (!roundStarted) startGame();
  });

  socket.on("submit-hint", (hint) => {
    if (!roundStarted) return;
    const player = players.find(p => p.id === socket.id);
    if (player && !hints.find(h => h.id === socket.id)) {
      hints.push({ id: socket.id, name: player.name, hint });
    }

    if (hints.length === players.length - 1) {
      io.emit("show-hints", { hints, players });
    }
  });

  socket.on("vote-spy", (targetId) => {
    if (!roundStarted) return;
    const player = players.find(p => p.id === socket.id);
    if (player && !player.vote) {
      player.vote = targetId;
    }

    const allVoted = players.filter(p => p.id !== spyId).every(p => p.vote);
    if (allVoted) endRound();
  });

  socket.on("chat-message", (msg) => {
    const player = players.find(p => p.id === socket.id);
    if (player) {
      io.emit("chat-message", { name: player.name, message: msg });
    }
  });

  socket.on("disconnect", () => {
    players = players.filter(p => p.id !== socket.id);
    io.emit("update-players", players);

    if (socket.id === spyId) {
      roundStarted = false;
      io.emit("chat-message", { name: "النظام", message: "👤 العميل غادر اللعبة. جاري بدء جولة جديدة..." });
      setTimeout(() => startGame(), 2000);
    }
  });
});

server.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
});
