const config = { databaseURL: "https://stomple-default-rtdb.firebaseio.com/" };
if (!firebase.apps.length) firebase.initializeApp(config);
const db = firebase.database().ref('stomple_unesr_v11');

let myId = localStorage.getItem('stomple_id') || "U-" + Math.floor(Math.random() * 9999);
localStorage.setItem('stomple_id', myId);
let selectedColor = null;
let gameState = {};

db.on('value', (snap) => {
    gameState = snap.val() || { players: {}, tablero: null, turno: 0, host: "" };
    render();
});

function render() {
    const players = gameState.players || {};
    const keys = Object.keys(players);

    if (players[myId]) {
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('game-ui').style.display = 'flex';
        document.getElementById('my-dot').className = 'dot c' + players[myId].color;
        
        // Host Tools
        const isHost = gameState.host === myId;
        document.getElementById('admin-panel').style.display = isHost ? 'block' : 'none';
        
        drawBoard(keys);
        if (gameState.lastAction) document.getElementById('chat-box').innerText = gameState.lastAction;
    } else {
        drawSelector();
    }
}

function drawSelector() {
    const container = document.getElementById('color-opts');
    container.innerHTML = '';
    const taken = Object.values(gameState.players || {}).map(p => p.color);
    for (let i = 1; i <= 6; i++) {
        const isTaken = taken.includes(i);
        const div = document.createElement('div');
        div.className = `marble c${i} ${isTaken ? 'stomped' : ''}`;
        div.style.width = '55px'; div.style.height = '55px';
        if (!isTaken) div.onclick = () => {
            selectedColor = i;
            document.getElementById('join-btn').disabled = false;
            container.querySelectorAll('.marble').forEach(m => m.style.boxShadow = 'none');
            div.style.boxShadow = '0 0 15px white';
        };
        container.appendChild(div);
    }
}

async function unirse() {
    let updates = {};
    if (!gameState.host) {
        updates.host = myId;
        updates.turno = 0;
        updates.tablero = Array.from({length:10}, () => Array.from({length:10}, () => Math.floor(Math.random()*6)+1));
    }
    updates[`players/${myId}`] = { color: selectedColor, pos: {r:-1, c:-1}, pNum: Object.keys(gameState.players || {}).length + 1, status: 'playing' };
    db.update(updates);
}

function drawBoard(keys) {
    const b = document.getElementById('board');
    b.innerHTML = '';
    gameState.tablero.forEach((fila, r) => {
        fila.forEach((color, c) => {
            const m = document.createElement('div');
            m.className = `marble c${color} ${color === 0 ? 'stomped' : ''}`;
            keys.forEach(id => {
                const p = gameState.players[id];
                if (p.pos.r === r && p.pos.c === c) {
                    const t = document.createElement('div');
                    t.className = 'p-token';
                    t.innerText = id === myId ? 'YO' : 'P' + p.pNum;
                    t.style.position = 'absolute'; t.style.inset = '10%'; t.style.border = '2px solid white'; t.style.borderRadius = '50%'; t.style.fontSize = '10px'; t.style.display = 'flex'; t.style.alignItems = 'center'; t.style.justifyContent = 'center';
                    m.appendChild(t);
                }
            });
            m.onclick = () => mover(r, c, keys);
            b.appendChild(m);
        });
    });
    const turnoId = keys[gameState.turno];
    document.getElementById('status-msg').innerText = (turnoId === myId) ? "⭐ TU TURNO" : "Turno de P" + gameState.players[turnoId]?.pNum;
}

function mover(r, c, keys) {
    if (keys[gameState.turno] !== myId) return;
    const p = gameState.players[myId];
    // ... (Lógica de movimiento que ya teníamos, pero limpia)
    let nt = JSON.parse(JSON.stringify(gameState.tablero));
    const target = nt[r][c];
    if (target === 0) return;
    
    const hundir = (rr, cc) => {
        if (rr<0||rr>=10||cc<0||cc>=10||nt[rr][cc]!==target) return;
        nt[rr][cc] = 0;
        hundir(rr+1,cc); hundir(rr-1,cc); hundir(rr,cc+1); hundir(rr,cc-1);
    };
    hundir(r, c);
    db.update({ tablero: nt, [`players/${myId}/pos`]: {r, c}, turno: (gameState.turno + 1) % keys.length });
}

function enviarAccion(emoji) {
    db.child('lastAction').set(`P${gameState.players[myId].pNum} dice: ${emoji}`);
}

function toggleReglas() {
    const m = document.getElementById('rules-modal');
    m.style.display = (m.style.display === 'none') ? 'flex' : 'none';
}

function salir() { db.child('players/'+myId).remove().then(() => location.reload()); }
