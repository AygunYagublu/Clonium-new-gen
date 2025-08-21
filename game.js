/* =========================
   Chain Reaction - game.js
   ========================= */

let gridSize, numPlayers, numBots, aiType;
let board = [];
let currentPlayer = 0;
let players = [];
let gameActive = false;


document.getElementById("themeSelect").addEventListener("change", e => {
  document.body.dataset.theme = e.target.value;
});
document.getElementById("volumeSlider").addEventListener("input", e => {
  document.getElementById("explosionSound").volume = parseFloat(e.target.value);
});

document.getElementById('colorP0').addEventListener('input', (e) => {
    const color = e.target.value;
    document.documentElement.style.setProperty('--player0', color);
    document.getElementById('colorPreviewP0').style.background = color;
});

/* ---------- DOM Ready ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Enforce bots <= players - 1
  const playersInput = document.getElementById('playersInput');
  const botsInput = document.getElementById('botsInput');

  function clampBots() {
    const p = parseInt(playersInput.value || '2', 10);
    const maxBots = Math.max(0, p - 1);
    botsInput.max = String(maxBots);
    if (parseInt(botsInput.value || '0', 10) > maxBots) {
      botsInput.value = String(maxBots);
    }
  }
  if (playersInput && botsInput) {
    playersInput.addEventListener('input', clampBots);
    botsInput.addEventListener('input', clampBots);
    clampBots();
  }

  // Explosion canvas overlay
  const boardWrap = document.getElementById('boardWrap');
  const canvas = document.getElementById('explosionCanvas');
  if (boardWrap && canvas) {
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
  }

  // How to Play button (in HUD)
  const htpBtn = document.getElementById('howToPlayBtn');
  if (htpBtn) htpBtn.addEventListener('click', openHowToPlay);

  // Theme selector
  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect) {
    themeSelect.addEventListener("change", e => {
      document.body.dataset.theme = e.target.value;
    });
  }

  // Volume slider
  const volumeSlider = document.getElementById("volumeSlider");
  if (volumeSlider) {
    volumeSlider.addEventListener("input", e => {
      const explosionSound = document.getElementById("explosionSound");
      if (explosionSound) explosionSound.volume = parseFloat(e.target.value);
    });
  }

  // Player 0 color picker
  const colorP0 = document.getElementById('colorP0');
  if (colorP0) {
    colorP0.addEventListener('input', e => {
      const color = e.target.value;
      document.documentElement.style.setProperty('--player0', color);
      const preview = document.getElementById('colorPreviewP0');
      if (preview) preview.style.background = color;
    });
  }

  // Update color pickers for multiple players
  const colorWrap = document.getElementById('colorSettingsWrap');
  function updateColorPickers() {
    if (!colorWrap || !playersInput) return;
    colorWrap.innerHTML = '';
    const count = parseInt(playersInput.value, 10);
    for (let i = 0; i < count; i++) {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <label>Player ${i+1} Color</label>
        <input type="color" id="playerColor${i}" value="${getComputedStyle(document.documentElement).getPropertyValue(`--player${i}`).trim()}">
      `;
      colorWrap.appendChild(row);
      const picker = document.getElementById(`playerColor${i}`);
      if (picker) {
        picker.addEventListener('input', e => {
          document.documentElement.style.setProperty(`--player${i}`, e.target.value);
        });
      }
    }
  }
  if (playersInput) {
    playersInput.addEventListener('input', updateColorPickers);
    updateColorPickers();
  }
});


/* ---------- Menu navigation ---------- */
function openSettingsMenu() {
  document.getElementById('mainMenu').classList.add('hidden');
  document.getElementById('settingsMenu').classList.remove('hidden');
}
function backToMainMenu() {
  gameActive = false;
  document.getElementById('gameUI').classList.add('hidden');
  document.getElementById('settingsMenu').classList.add('hidden');
  document.getElementById('mainMenu').classList.remove('hidden');
  hideWinnerBanner();
  setStatus('');
}
function openSettingsPlaceholder() {
  alert('Settings will be available soon!');
}
function exitGame() {
  alert('Thanks for playing! You can close the tab to exit.');
}


function updateColorPickers() {
  const wrap = document.getElementById('colorSettingsWrap');
  wrap.innerHTML = '';
  const count = parseInt(document.getElementById('playersInput').value, 10);
  for (let i = 0; i < count; i++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <label>Player ${i+1} Color</label>
      <input type="color" id="playerColor${i}" value="${getComputedStyle(document.documentElement).getPropertyValue(`--player${i}`).trim()}">
    `;
    wrap.appendChild(row);
    document.getElementById(`playerColor${i}`).addEventListener('input', e => {
      document.documentElement.style.setProperty(`--player${i}`, e.target.value);
    });
  }
}
document.getElementById('playersInput').addEventListener('input', updateColorPickers);
updateColorPickers();

/* ---------- Start / Restart ---------- */
function startGame() {
  gridSize   = parseInt(document.getElementById("gridSizeInput").value, 10);
  numPlayers = parseInt(document.getElementById("playersInput").value, 10);
  numBots    = parseInt(document.getElementById("botsInput").value, 10);
  aiType     = document.getElementById("aiTypeSelect").value;

  // Safety: AI cannot exceed Players - 1
  const maxBots = Math.max(0, numPlayers - 1);
  if (numBots > maxBots) {
    numBots = maxBots;
    document.getElementById("botsInput").value = String(maxBots);
  }

  // Build players array (first numBots are AIs)
  players = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push({ type: i < numBots ? "AI" : "Human" });
  }

  // Build empty board
  board = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));

  // Seed corners with 3 orbs per player (up to 4 players)
  seedStartingCells();

  currentPlayer = 0;
  gameActive = true;

  // Switch to game UI
  document.getElementById('settingsMenu').classList.add('hidden');
  document.getElementById('gameUI').classList.remove('hidden');
  hideWinnerBanner();
  setStatus('');

  fitExplosionCanvas();
  renderBoard();

  // If AI starts
  if (players[currentPlayer].type === 'AI') {
    setTimeout(aiMove, 450);
  }
}

function restartGame() {
  // Restart using current settings values (keeps menus hidden)
  startGame();
}

/* ---------- Seeding ---------- */
function seedStartingCells() {
  const corners = [
    [1, 1],
    [1, gridSize - 2],
    [gridSize - 2, 1],
    [gridSize - 2, gridSize - 2]
  ];
  for (let i = 0; i < numPlayers; i++) {
    const [r, c] = corners[i] || randomEmptyCell();
    board[r][c] = { owner: i, orbs: 3 };
  }
}
function randomEmptyCell() {
  while (true) {
    const r = Math.floor(Math.random() * gridSize);
    const c = Math.floor(Math.random() * gridSize);
    if (!board[r][c]) return [r, c];
  }
}

/* ---------- Rendering ---------- */
function renderBoard() {
  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML = "";
  boardDiv.style.gridTemplateColumns = `repeat(${gridSize}, var(--cell-size))`;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cellEl = document.createElement("div");
      cellEl.className = "cell";

      const cellData = board[r][c];
      if (cellData) {
        cellEl.classList.add(`owner-${cellData.owner}`);
        if (players[cellData.owner]?.type === "AI") {
          cellEl.classList.add("ai");
        }
        if (cellData.owner === currentPlayer && players[currentPlayer].type === "Human") {
          cellEl.classList.add("clickable");
        }
        cellEl.appendChild(makeDots(cellData.orbs));
      }

      cellEl.onclick = () => {
  if (!gameActive) return;

  if (canPlaceOrb(r, c, currentPlayer)) {
    handleCellClick(r, c);
  }
};


      boardDiv.appendChild(cellEl);
    }
  }

  // Turn HUD
  const colorVal = getComputedStyle(document.documentElement).getPropertyValue(`--player${currentPlayer}`).trim() || '#fff';
  document.getElementById("turnColor").style.background = colorVal;
  document.getElementById("turnLabel").textContent = `Player ${currentPlayer + 1} (${players[currentPlayer].type})`;

  fitExplosionCanvas();
}

function makeDots(count) {
  const dotsDiv = document.createElement("div");
  dotsDiv.className = "dots";
  const positions = {
    1: ["pos1"],
    2: ["pos2a", "pos2b"],
    3: ["pos3a", "pos3b", "pos3c"],
    4: ["pos4a", "pos4b", "pos4c", "pos4d"]
  };
  (positions[count] || []).forEach(pos => {
    const dot = document.createElement("div");
    dot.className = `dot ${pos}`;
    dotsDiv.appendChild(dot);
  });
  return dotsDiv;
}

/* ---------- Game Rules ---------- */
function capacityAt(r, c) {
  let cap = 4;
  if (r === 0 || r === gridSize - 1) cap--;
  if (c === 0 || c === gridSize - 1) cap--;
  return cap;
}
function canPlaceOrb(r, c, player) {
  return board[r][c] && board[r][c].owner === player;
}



/* ---------- Input ---------- */
async function handleCellClick(r, c) {
  if (!gameActive) return;
  if (players[currentPlayer].type !== "Human") return;
  if (!canPlaceOrb(r, c, currentPlayer)) return;

  addOrb(r, c, currentPlayer);
  renderBoard();

  await processExplosions();
  if (gameActive) nextTurn();
}

/* ---------- Board Ops ---------- */
function addOrb(r, c, owner) {
  if (!board[r][c]) {
    board[r][c] = { owner, orbs: 1 };
  } else {
    board[r][c].orbs++;
    board[r][c].owner = owner;
  }
}

/* ---------- Chain Reactions & Animation ---------- */
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function processExplosions() {
  const explosionSound = document.getElementById("explosionSound");

  while (true) {
    const wave = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cell = board[r][c];
        if (cell && cell.orbs >= capacityAt(r, c)) {
          wave.push({ r, c, owner: cell.owner });
        }
      }
    }
    if (!wave.length) break;

    // Play one sound per wave
    if (explosionSound) {
      try { explosionSound.currentTime = 0; explosionSound.play(); } catch {}
    }

    // Animate wave
    await animateExplosions(wave);

    // Apply wave
    for (const { r, c, owner } of wave) {
      if (!board[r][c]) continue;
      if (board[r][c].orbs < capacityAt(r, c)) continue;
      board[r][c] = null;
      const neigh = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
      for (const [nr, nc] of neigh) {
        if (nr<0||nr>=gridSize||nc<0||nc>=gridSize) continue;
        if (!board[nr][nc]) board[nr][nc] = { owner, orbs: 1 };
        else { board[nr][nc].orbs++; board[nr][nc].owner = owner; }
      }
    }

    renderBoard();

    // If only one player left, stop immediately
    if (checkWin()) {
      gameActive = false;
      return;
    }
    await sleep(80);
  }
}

function fitExplosionCanvas() {
  const boardDiv = document.getElementById('board');
  const canvas = document.getElementById('explosionCanvas');
  if (!boardDiv || !canvas) return;
  const rect = boardDiv.getBoundingClientRect();
  canvas.width = Math.ceil(rect.width);
  canvas.height = Math.ceil(rect.height);
}

function animateExplosions(explosions) {
  return new Promise(resolve => {
    const canvas = document.getElementById('explosionCanvas');
    const ctx = canvas.getContext('2d');
    const start = performance.now();
    const duration = 260;

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const ex of explosions) {
        const { x, y } = getCellCenter(ex.r, ex.c);
        const color = ownerColor(ex.owner);
        const baseRadius = Math.max(0, cssVarNumber('--cell-size', 56));
        const radius = Math.max(0.1, t * baseRadius);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * (1 - t);
        ctx.stroke();
      }

      if (t < 1 && gameActive) requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, canvas.width, canvas.height); resolve(); }
    }
    requestAnimationFrame(frame);
  });
}

function getCellCenter(r, c) {
  const cell = cssVarNumber('--cell-size', 56);
  const gap = 8;     // matches CSS grid gap
  const pad = 12;    // matches #board padding
  const x = c * (cell + gap) + pad + cell / 2;
  const y = r * (cell + gap) + pad + cell / 2;
  return { x, y };
}

function cssVarNumber(name, fallback) {
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!val) return fallback;
  if (val.endsWith('px')) return parseFloat(val);
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
}
function ownerColor(owner) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--player${owner}`).trim() || '#fff';
}

/* ---------- Win & Status ---------- */
function checkWin() {
  const alive = new Set();
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = board[r][c];
      if (cell) alive.add(cell.owner);
    }
  }
  if (alive.size === 1 && board.flat().some(Boolean)) {
    const winner = [...alive][0];
    showWinnerBanner(winner);
    setStatus('');
    return true;
  }
  return false;
}
function setStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

/* ---------- Turn Management ---------- */
function nextTurn() {
  if (!gameActive) return;
  currentPlayer = (currentPlayer + 1) % numPlayers;
  renderBoard();

  // Skip eliminated players (no cells)
  if (!playerHasAnyCells(currentPlayer)) return nextTurn();

  if (players[currentPlayer].type === "AI") {
    setTimeout(aiMove, 450);
  }
}
function playerHasAnyCells(p) {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (board[r][c]?.owner === p) return true;
    }
  }
  return false;
}

/* ---------- AI ---------- */
function aiMove() {
  if (!gameActive) return;

  const moves = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (canPlaceOrb(r, c, currentPlayer)) moves.push([r, c]);
    }
  }
  if (!moves.length) { nextTurn(); return; }

  let choice;
  if (aiType === "random") {
    choice = moves[Math.floor(Math.random() * moves.length)];
  } else {
    // greedy: maximize potential explosions
    choice = moves.sort((a, b) =>
      potentialExplosions(b[0], b[1], currentPlayer) -
      potentialExplosions(a[0], a[1], currentPlayer)
    )[0];
  }

  addOrb(choice[0], choice[1], currentPlayer);
  renderBoard();
  processExplosions().then(() => { if (gameActive) nextTurn(); });
}

function potentialExplosions(r, c, player) {
  const temp = board.map(row => row.map(cell => cell ? { ...cell } : null));
  if (!temp[r][c]) temp[r][c] = { owner: player, orbs: 1 };
  else { temp[r][c].orbs++; temp[r][c].owner = player; }

  let count = 0;
  const q = [];
  for (let rr = 0; rr < gridSize; rr++) {
    for (let cc = 0; cc < gridSize; cc++) {
      const cell = temp[rr][cc];
      if (cell && cell.orbs >= capacityAt(rr, cc)) q.push([rr, cc, cell.owner]);
    }
  }
  while (q.length) {
    const [rr, cc, owner] = q.shift();
    if (!temp[rr][cc]) continue;
    if (temp[rr][cc].orbs < capacityAt(rr, cc)) continue;
    count++;
    temp[rr][cc] = null;
    const neigh = [[rr-1,cc],[rr+1,cc],[rr,cc-1],[rr,cc+1]];
    for (const [nr, nc] of neigh) {
      if (nr<0||nr>=gridSize||nc<0||nc>=gridSize) continue;
      if (!temp[nr][nc]) temp[nr][nc] = { owner, orbs: 1 };
      else { temp[nr][nc].orbs++; temp[nr][nc].owner = owner; }
      if (temp[nr][nc].orbs >= capacityAt(nr, nc)) q.push([nr, nc, owner]);
    }
  }
  return count;
}

/* ---------- Winner Banner & Modal ---------- */
function showWinnerBanner(winner) {
  const banner = document.getElementById('winnerBanner');
  if (!banner) return;
  banner.textContent = `🎉 Player ${winner + 1} Wins! 🎉`;
  banner.classList.remove('hidden');
  requestAnimationFrame(() => banner.classList.add('show'));
  gameActive = false;
}
function hideWinnerBanner() {
  const banner = document.getElementById('winnerBanner');
  if (!banner) return;
  banner.classList.remove('show');
  banner.classList.add('hidden');
}

function openHowToPlay() {
  const modal = document.getElementById('howToPlayModal');
  if (modal) modal.classList.remove('hidden');
}
function closeHowToPlay() {
  const modal = document.getElementById('howToPlayModal');
  if (modal) modal.classList.add('hidden');
}

/* ---------- Expose ---------- */
window.openSettingsMenu = openSettingsMenu;
window.backToMainMenu = backToMainMenu;
window.openSettingsPlaceholder = openSettingsPlaceholder;
window.exitGame = exitGame;

window.startGame = startGame;
window.restartGame = restartGame;

window.closeHowToPlay = closeHowToPlay;
