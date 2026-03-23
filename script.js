const config = { databaseURL: "https://stomple-default-rtdb.firebaseio.com/" };
if (!firebase.apps.length) firebase.initializeApp(config);
const db = firebase.database().ref('stomple_unesr_v13');

let myId = localStorage.getItem('stomple_id') || "U-" + Math.floor(Math.random() * 9999);
localStorage.setItem('stomple_id', myId);
let myColor = null;
let gameData = {};

db.on('value', (snap) => {
    gameData = snap.val() || { players: {}, board: null, turn: 0, host: "" };
    render();
});

function render() {
    const players = gameData.players || {};
    const keys = Object.keys(players);

    if (players[myId]) {
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('game-ui').style.display = 'flex';
        
        // Mostrar Host Tools
        const isHost = gameData.host === myId;
        document.getElementById('admin-panel').style.display = isHost ? 'block' : 'none';
        
        if (isHost) renderKickTools(keys);
        renderBoard(keys);
        if (gameData.msg) document.getElementById('chat-box').innerText = gameData.msg;
    } else {
        renderSelector();
    }
}

function renderSelector() {
    const container = document.getElementById('color-opts');
    container.innerHTML = '';
    const taken = Object.values(gameData.players || {}).map(p => p.color);
    for (let i = 1; i <= 6; i++) {
        const div = document.createElement('div');
        div.className = `marble c${i} ${taken.includes(i) ? 'stomped' : ''}`;
        div.style.height = '60px';
        if (!taken.includes(i)) div.onclick = () => {
            myColor = i;
            document.getElementById('join-btn').disabled = false;
            container.querySelectorAll('.marble').forEach(m => m.style.boxShadow = 'none');
            div.style.boxShadow = '0 0 15px #38bdf8';
        };
        container.appendChild(div);
    }
}

function unirse() {
    let up = {};
    if (!gameData.host) {
        up.host = myId;
        up.turn = 0;
        up.board = Array.from({length:10}, () => Array.from({length:10}, () => Math.floor(Math.random()*6)+1));
    }
    up[`players/${myId}`] = { color: myColor, r: -1, c: -1, pNum: Object.keys(gameData.players || {}).length + 1 };
    db.update(up);
}

function renderBoard(keys) {
    const b = document.getElementById('board');
    b.innerHTML = '';
    if (!gameData.board) return;

    gameData.board.forEach((row, r) => {
        row.forEach((col, c) => {
            const m = document.createElement('div');
            m.className = `marble c${col} ${col === 0 ? 'stomped' : ''}`;
            keys.forEach(id => {
                const p = gameData.players[id];
                if (p.r === r && p.c === c) {
                    const t = document.createElement('div');
                    t.className = 'p-token';
                    t.innerText = id === myId ? 'YO' : 'P' + p.pNum;
                    m.appendChild(t);
                }
            });
            m.onclick = () => mover(r, c, keys);
            b.appendChild(m);
        });
    });
    const turnId = keys[gameData.turn];
    document.getElementById('status-msg').innerText = (turnId === myId) ? "⭐ TU TURNO" : "Turno de P" + gameData.players[turnId]?.pNum;
}

function mover(r, c, keys) {
    if (keys[gameData.turn] !== myId) return;
    let nb = JSON.parse(JSON.stringify(gameData.board));
    if (nb[r][c] === 0) return;
    nb[r][c] = 0; // Lógica de hundir simple
    db.update({ board: nb, [`players/${myId}/r`]: r, [`players/${myId}/c`]: c, turn: (gameData.turn + 1) % keys.length });
}

function renderKickTools(keys) {
    const list = document.getElementById('kick-list');
    list.innerHTML = '';
    keys.forEach(id => {
        if (id !== myId) {
            const btn = document.createElement('button');
            btn.innerText = 'Expulsar P' + gameData.players[id].pNum;
            btn.onclick = () => db.child('players/' + id).remove();
            list.appendChild(btn);
        }
    });
}

function reiniciarTodo() {
    const nb = Array.from({length:10}, () => Array.from({length:10}, () => Math.floor(Math.random()*6)+1));
    let up = { board: nb, turn: 0, msg: "¡Partida Reiniciada!" };
    Object.keys(gameData.players).forEach(id => { up[`players/${id}/r`] = -1; up[`players/${id}/c`] = -1; });
    db.update(up);
}

function sendEmoji(e) { db.child('msg').set(`P${gameData.players[myId].pNum} dice: ${e}`); }
function salir() { db.child('players/' + myId).remove().then(() => location.reload()); }
