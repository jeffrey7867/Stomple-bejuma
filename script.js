const config = { databaseURL: "https://stomple-default-rtdb.firebaseio.com/" };
if (!firebase.apps.length) firebase.initializeApp(config);
const ref = firebase.database().ref('stomple_unesr_final_v10');

let myId = localStorage.getItem('stomple_id') || "U-" + Math.floor(Math.random() * 9999);
localStorage.setItem('stomple_id', myId);
let selectedColor = null;
let localData = { players: {}, tablero: null, turno: 0, host: "" };

ref.on('value', (snap) => {
    localData = snap.val() || { players: {}, tablero: null, turno: 0, host: "" };
    actualizarTodo();
});

function actualizarTodo() {
    const players = localData.players || {};
    const keys = Object.keys(players);

    if (players[myId]) {
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('game-ui').style.display = 'flex';
        document.getElementById('my-dot').className = 'dot c' + players[myId].color;
        
        // Control Host
        const isAdmin = localData.host === myId;
        document.getElementById('admin-panel').style.display = isAdmin ? 'block' : 'none';
        document.getElementById('host-reset-btn').style.display = isAdmin ? 'block' : 'none';
        
        renderBoard(keys);
        renderKicks(keys);
        checkVictory(keys);
        if (localData.lastAction) {
            document.getElementById('chat-box').innerText = localData.lastAction;
        }
    } else {
        renderSelector();
    }
}

function renderSelector() {
    const container = document.getElementById('color-opts');
    container.innerHTML = '';
    const taken = Object.values(localData.players || {}).map(p => p.color);
    for (let i = 1; i <= 6; i++) {
        const isTaken = taken.includes(i);
        const div = document.createElement('div');
        div.className = `marble c${i} ${isTaken ? 'stomped' : ''}`;
        div.style.width = '60px'; div.style.height = '60px';
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
    let up = {};
    if (!localData.host) {
        up.host = myId;
        up.turno = 0;
        up.tablero = Array.from({length:10}, () => Array.from({length:10}, () => Math.floor(Math.random()*6)+1));
    }
    up[`players/${myId}`] = { color: selectedColor, pos: {r:-1, c:-1}, pNum: Object.keys(localData.players || {}).length + 1, status: 'playing' };
    ref.update(up);
}

function renderBoard(keys) {
    const b = document.getElementById('board');
    b.innerHTML = '';
    localData.tablero.forEach((fila, r) => {
        fila.forEach((color, c) => {
            const m = document.createElement('div');
            m.className = `marble c${color} ${color === 0 ? 'stomped' : ''}`;
            keys.forEach(id => {
                const p = localData.players[id];
                if (p.pos.r === r && p.pos.c === c) {
                    const t = document.createElement('div');
                    t.className = `p-token ${id === myId ? 'my-token' : ''}`;
                    t.innerText = id === myId ? 'YO' : 'P' + p.pNum;
                    m.appendChild(t);
                }
            });
            m.onclick = () => mover(r, c, keys);
            b.appendChild(m);
        });
    });
    const actual = keys[localData.turno];
    document.getElementById('status-msg').innerText = (actual === myId) ? "⭐ TU TURNO ⭐" : "Turno de P" + localData.players[actual]?.pNum;
}

function mover(r, c, keys) {
    if (keys[localData.turno] !== myId) return;
    const p = localData.players[myId];
    const esAdy = Math.abs(p.pos.r - r) <= 1 && Math.abs(p.pos.c - c) <= 1;
    if (p.pos.r === -1) { if (r!==0 && r!==9 && c!==0 && c!==9) return; }
    else if (!esAdy && localData.tablero[r][c] !== p.color) return;

    let nt = JSON.parse(JSON.stringify(localData.tablero));
    const target = nt[r][c];
    if (target === 0) return;

    const hundir = (rr, cc) => {
        if (rr<0||rr>=10||cc<0||cc>=10||nt[rr][cc]!==target) return;
        nt[rr][cc] = 0;
        hundir(rr+1,cc); hundir(rr-1,cc); hundir(rr,cc+1); hundir(rr,cc-1);
    };
    hundir(r, c);
    ref.update({ tablero: nt, [`players/${myId}/pos`]: {r, c} });
    pasarTurno(keys);
}

function pasarTurno(keys) {
    let n = (localData.turno + 1) % keys.length;
    while (localData.players[keys[n]].status === 'eliminated') n = (n + 1) % keys.length;
    ref.child('turno').set(n);
}

function enviarAccion(emoji) {
    const p = localData.players[myId];
    ref.child('lastAction').set(`P${p.pNum} dice: ${emoji}`);
}

function toggleReglas() {
    const m = document.getElementById('rules-modal');
    m.style.display = (m.style.display === 'none') ? 'flex' : 'none';
}

function reiniciarTodo() {
    const nt = Array.from({length:10}, () => Array.from({length:10}, () => Math.floor(Math.random()*6)+1));
    const up = { tablero: nt, turno: 0, lastAction: "¡Partida Reiniciada!" };
    Object.keys(localData.players).forEach(id => {
        up[`players/${id}/pos`] = {r:-1, c:-1};
        up[`players/${id}/status`] = 'playing';
    });
    ref.update(up);
}

function renderKicks(keys) {
    const list = document.getElementById('kick-list');
    list.innerHTML = '';
    keys.forEach(id => {
        if (id !== myId) {
            const b = document.createElement('button');
            b.innerText = 'X P' + localData.players[id].pNum;
            b.onclick = () => ref.child('players/'+id).remove();
            list.appendChild(b);
        }
    });
}

function salir() {
    ref.child('players/'+myId).remove().then(() => location.reload());
}

function checkVictory(keys) {
    const active = keys.filter(k => localData.players[k].status === 'playing');
    if (active.length === 1 && keys.length > 1) {
        document.getElementById('win-screen').style.display = 'flex';
        document.getElementById('winner-text').innerText = 'P' + localData.players[active[0]].pNum + ' GANÓ';
    }
}

