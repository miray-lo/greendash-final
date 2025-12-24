const express = require('express');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // <--- 很多人修改時會不小心刪掉這行，導致 500 Error

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 讓雲端決定 Port
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());

// --- 關鍵修改：雙重保險 ---
// 1. 先試著找 public 資料夾 (如果你的檔案在 public 裡)
app.use(express.static(path.join(__dirname, 'public')));
// 2. 如果沒找到，再試著找根目錄 (如果你的檔案在最外面)
app.use(express.static(__dirname));

// --- 資料庫讀寫 ---
function readDB() {
    // 如果檔案不存在，回傳空陣列，防止報錯
    if (!fs.existsSync(DATA_FILE)) return { users: [] };
    try { return JSON.parse(fs.readFileSync(DATA_FILE)); } catch (e) { return { users: [] }; }
}
function writeDB(data) { 
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch (e) { console.error("Write Error:", e); }
}

// --- API ---
app.post('/api/auth', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).send({ msg: "ID Required" });
    const db = readDB();
    let user = db.users.find(u => u.username === username);
    if (user) {
        res.send({ status: 'success', type: 'login', username: user.username, seed: user.seed, tasks: user.tasks || [], wasteLogs: user.wasteLogs || [] });
    } else {
        const newUser = { username, seed: Math.random().toString(36).substring(7), tasks: [], wasteLogs: [] };
        db.users.push(newUser); writeDB(db);
        res.send({ status: 'success', type: 'register', username: newUser.username, seed: newUser.seed, tasks: [], wasteLogs: [] });
    }
});

app.post('/api/save', (req, res) => {
    const { username, tasks } = req.body;
    const db = readDB();
    const idx = db.users.findIndex(u => u.username === username);
    if (idx !== -1) { db.users[idx].tasks = tasks; writeDB(db); res.send({ status: 'success' }); }
    else res.status(404).send({ msg: "User not found" });
});

app.post('/api/log-waste', (req, res) => {
    const { username, logItem } = req.body;
    const db = readDB();
    const idx = db.users.findIndex(u => u.username === username);
    if (idx !== -1) {
        if (!db.users[idx].wasteLogs) db.users[idx].wasteLogs = [];
        db.users[idx].wasteLogs.unshift(logItem);
        if (db.users[idx].wasteLogs.length > 50) db.users[idx].wasteLogs = db.users[idx].wasteLogs.slice(0, 50);
        writeDB(db); res.send({ status: 'success', wasteLogs: db.users[idx].wasteLogs });
    } else res.status(404).send({ msg: "User not found" });
});

app.get('/api/leaderboard', (req, res) => {
    const db = readDB();
    const leaderboard = db.users.map(u => {
        const tasks = u.tasks || []; const logs = u.wasteLogs || [];
        const score = parseFloat((tasks.filter(t => t.isChecked).length * 10 + logs.length * 5).toFixed(0));
        return { name: u.username, score, seed: u.seed };
    });
    leaderboard.sort((a, b) => b.score - a.score);
    res.send(leaderboard);
});

// --- Socket.io ---
const QUESTIONS = [
    { q: "寶特瓶回收標誌是幾號？", opts: ["1號", "2號", "5號", "7號"], ans: 0 },
    { q: "哪種吸管最環保？", opts: ["塑膠", "不鏽鋼", "就口喝", "紙吸管"], ans: 2 },
    { q: "SDG 13 是什麼？", opts: ["消除貧窮", "氣候行動", "水下生命", "優質教育"], ans: 1 },
    { q: "洗米水可以？", opts: ["倒掉", "澆花", "洗車", "以上皆是"], ans: 3 },
    { q: "一公斤牛肉碳排約？", opts: ["10kg", "27kg", "60kg", "100kg"], ans: 2 }
];
let battle = { status: 'waiting', players: {}, currentQ: 0, timer: 10 };

io.on('connection', (socket) => {
    socket.on('join_battle', (u) => {
        battle.players[socket.id] = { name: u.name, score: 0, avatar: u.seed };
        io.emit('update_room', { players: Object.values(battle.players), status: battle.status });
    });
    socket.on('start_game', () => {
        if (battle.status === 'playing') return;
        battle.status = 'playing'; battle.currentQ = 0;
        for (let id in battle.players) battle.players[id].score = 0;
        runGameLoop();
    });
    socket.on('submit_answer', (idx) => {
        const p = battle.players[socket.id];
        if (!p || battle.status !== 'playing') return;
        const correct = QUESTIONS[battle.currentQ].ans;
        if (idx === correct) p.score += (100 + battle.timer * 10);
        socket.emit('answer_result', { correct: idx === correct, score: p.score });
    });
    socket.on('disconnect', () => {
        delete battle.players[socket.id];
        io.emit('update_room', { players: Object.values(battle.players) });
    });
});

function runGameLoop() {
    if (battle.currentQ >= QUESTIONS.length) {
        battle.status = 'result'; io.emit('game_over', Object.values(battle.players).sort((a,b)=>b.score-a.score)); battle.status = 'waiting'; return;
    }
    battle.timer = 10;
    io.emit('new_question', { q: QUESTIONS[battle.currentQ], total: QUESTIONS.length, current: battle.currentQ + 1 });
    const iv = setInterval(() => {
        battle.timer--;
        io.emit('timer_update', battle.timer);
        if (battle.timer <= 0) {
            clearInterval(iv); battle.currentQ++; setTimeout(runGameLoop, 3000);
        }
    }, 1000);
}

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
