const config = { databaseURL: "https://stomple-default-rtdb.firebaseio.com/" };
if (!firebase.apps.length) firebase.initializeApp(config);
const db = firebase.database().ref('stomple_v12_mobile');

let myId = localStorage.getItem('stomple_id') || "U-" + Math.floor(Math.random() * 9999);
localStorage.setItem('stomple_id', myId);
let selectedColor = null;
let state = {};

db.on('value', (snap) => {
    state = snap.val() || { players: {}, tablero: null, turno: 0, host: "" };
    syncUI();
});

function syncUI() {
    const p = state.players || {};
    const keys = Object.keys(p);

    if (p[myId]) {
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('game-ui').style.display = 'flex';
        document.getElementById('my-dot').className = 'mini-dot c' + p[myId].color;
        
        // Host check
        document.getElementById('admin-panel').style.display = (state.host === myId) ? 'block' : 'none';
        
        renderBoard(keys);
        if (state.msg) document.getElementById('chat-box').innerText = state.msg;
    } else {
        renderColorPicker();
    }
}

function renderColorPicker() {
    const container = document.getElementById('color-opts');
    container.innerHTML = '';
    const taken = Object.values(state.players || {}).map(pl => pl.color);
    for (let i = 1; i <= 6; i++) {
        const div = document.createElement('div');
        div.className = `marble c${i} ${taken.includes(i) ? 'stomped' : ''}`;
        div.style.height = '60px';
        if (!taken.includes(i)) div.onclick = () => {
            selectedColor = i;
            document.getElementById('join-btn').disabled = false;
            container.querySelectorAll('.marble').forEach(m => m.style.outline = 'none');
            div.style.outline = '3px solid white';
        };
        container.appendChild(div);
    }
}

async function unirse() {
    let up = {};
    if (!state.host) {
        up.host = myId;
        up.turno = 0;
        up.tablero = Array.from({length:10}, () => Array.from({length:10}, () => Math.floor(Math.random()*6)+1));
    }
    up[`players/${myId}`] = { color: selectedColor, pos: {r:-1, c:-1}, pNum: Object.keys(state.players || {}).length + 1, status: 'playing' };
    db.update(up);
}

function renderBoard(keys) {
    const b = document.getElementById('board');
    b.innerHTML = '';
    state.tablero.forEach((row, r) => {
        row.forEach((col, c) => {
            const m = document.createElement('div');
            m.className = `marble c${col} ${col === 0 ? 'stomped' : ''}`;
            keys.forEach(id => {
                const player = state.players[id];
                if (player.pos.r === r && player.pos.c === c) {
                    const token = document.createElement('div');
                    token.className = 'p-token';
                    token.innerText = id === myId ? 'YO' : 'P'+player.pNum;
                    m.appendChild(token);
                }
            });
            m.onclick = () => mover(r, c, keys);
            b.appendChild(m);
        });
    });
    const turnOwner = keys[state.turno];
    document.getElementById('status-msg').innerText = (turnOwner === myId) ? "TU TURNO ⭐" : "P" + state.players[turnOwner]?.pNum;
}

function mover(r, c, keys) {
    if (keys[state.turno] !== myId) return;
    const p = state.players[myId];
    // Validaciones de movimiento simplificadas para evitar errores
    let nt = JSON.parse(JSON.stringify(state.tablero));
    const targetColor = nt[r][c];
    if (targetColor === 0) return;

    const flood = (rr, cc) => {
        if (rr<0||rr>=10||cc<0||cc>=10||nt[rr][cc]!==targetColor) return;
        nt[rr][cc] = 0;
        flood(rr+1,cc); flood(rr-1,cc); flood(rr,cc+1); flood(rr,cc-1);
    };
    flood(r, c);
    db.update({ tablero: nt, [`players/${myId}/pos`]: {r, c}, turno: (state.turno + 1) % keys.length });
}

function enviarAccion(emo) { db.child('msg').set(`P${state.players[myId].pNum}: ${emo}`); }
function toggleReglas() { const m = document.getElementById('rules-modal'); m.style.display = (m.style.display==='none')?'flex':'none'; }
function salir() { db.child('players/'+myId).remove().then(()=>location.reload()); }
function reiniciarTodo() {
    const nt = Array.from({length:10}, () => Array.from({length:10}, () => Math.floor(Math.random()*6)+1));
    let up = { tablero: nt, turno: 0, msg: "¡Partida Reiniciada!" };
    Object.keys(state.players).forEach(id => { up[`players/${id}/pos`] = {r:-1, c:-1}; });
    db.update(up);
}
