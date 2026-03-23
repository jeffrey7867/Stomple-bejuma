const fbConfig = { databaseURL: "https://stomple-default-rtdb.firebaseio.com/" };
if (!firebase.apps.length) firebase.initializeApp(fbConfig);
const db = firebase.database().ref('stomple_final_v1');

let myId = localStorage.getItem('stomple_user') || "U" + Math.floor(Math.random()*1000);
localStorage.setItem('stomple_user', myId);
let myCol = null;
let state = {};

db.on('value', (snap) => {
    state = snap.val() || { players: {}, board: null, turn: 0, host: "" };
    renderApp();
});

function renderApp() {
    const p = state.players || {};
    const keys = Object.keys(p);

    if (p[myId]) {
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('game-ui').style.display = 'flex';
        
        // Lógica de Host
        const isHost = state.host === myId;
        document.getElementById('admin-panel').style.display = isHost ? 'block' : 'none';
        
        drawBoard(keys);
        if (state.lastMsg) document.getElementById('chat-box').innerText = state.lastMsg;
    } else {
        drawPicker();
    }
}

function drawPicker() {
    const container = document.getElementById('color-opts');
    container.innerHTML = '';
    const taken = Object.values(state.players || {}).map(pl => pl.color);
    for (let i = 1; i <= 6; i++) {
        const div = document.createElement('div');
        div.className = `marble c${i} ${taken.includes(i) ? 'stomped' : ''}`;
        div.style.height = '50px';
        if (!taken.includes(i)) div.onclick = () => {
            myCol = i;
            document.getElementById('join-btn').disabled = false;
            container.querySelectorAll('.marble').forEach(m => m.style.boxShadow = 'none');
            div.style.boxShadow = '0 0 15px #38bdf8';
        };
        container.appendChild(div);
    }
}

function unirse() {
    let up = {};
    if (!state.host) {
        up.host = myId;
        up.board = Array.from({length:10}, () => Array.from({length:10}, () => Math.floor(Math.random()*6)+1));
    }
    up[`players/${myId}`] = { color: myCol, r: -1, c: -1, pName: 'P'+(Object.keys(state.players||{}).length+1) };
    db.update(up);
}

function drawBoard(keys) {
    const b = document.getElementById('board'); b.innerHTML = '';
    if (!state.board) return;
    state.board.forEach((row, r) => {
        row.forEach((col, c) => {
            const m = document.createElement('div');
            m.className = `marble c${col} ${col === 0 ? 'stomped' : ''}`;
            keys.forEach(id => {
                if (state.players[id].r === r && state.players[id].c === c) {
                    const t = document.createElement('div');
                    t.innerText = id === myId ? 'YO' : state.players[id].pName;
                    t.style = "font-size:8px; border:1px solid white; border-radius:50%; width:80%; height:80%; margin:10%; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.5)";
                    m.appendChild(t);
                }
            });
            m.onclick = () => { if(keys[state.turn] === myId) handleMove(r, c, keys); };
            b.appendChild(m);
        });
    });
    document.getElementById('status-msg').innerText = (keys[state.turn] === myId) ? "TU TURNO ⭐" : "Turno de " + state.players[keys[state.turn]]?.pName;
}

function handleMove(r, c, keys) {
    let nb = JSON.parse(JSON.stringify(state.board));
    if (nb[r][c] === 0) return;
    nb[r][c] = 0; // Aquí puedes poner la lógica de hundir grupos luego
    db.update({ board: nb, [`players/${myId}/r`]: r, [`players/${myId}/c`]: c, turn: (state.turn + 1) % keys.length });
}

function enviarAccion(e) { db.child('lastMsg').set(`Dice: ${e}`); }
function salir() { db.child('players/'+myId).remove().then(() => location.reload()); }
function reiniciarTodo() {
    const nb = Array.from({length:10}, () => Array.from({length:10}, () => Math.floor(Math.random()*6)+1));
    db.update({ board: nb, turn: 0, lastMsg: "¡Partida Reiniciada!" });
}
