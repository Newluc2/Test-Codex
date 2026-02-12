const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");
const leaderboardEl = document.getElementById("leaderboard");
const statsEl = document.getElementById("player-stats");
const restartButton = document.getElementById("restart");

const WORLD = {
  width: 2000,
  height: 1200,
};

const BOT_COUNT = 8;
const ORB_COUNT = 140;

const keys = new Set();

const random = (min, max) => Math.random() * (max - min) + min;

const colors = [
  "#35d6ff",
  "#55efc4",
  "#ff7675",
  "#fdcb6e",
  "#74b9ff",
  "#a29bfe",
  "#fab1a0",
  "#ffeaa7",
  "#81ecec",
];

const createOrb = () => ({
  x: random(0, WORLD.width),
  y: random(0, WORLD.height),
  value: random(0.8, 1.6),
  color: colors[Math.floor(random(0, colors.length))],
});

function createEntity(name, isPlayer = false) {
  return {
    id: crypto.randomUUID(),
    name,
    isPlayer,
    x: random(120, WORLD.width - 120),
    y: random(120, WORLD.height - 120),
    vx: 0,
    vy: 0,
    angle: random(0, Math.PI * 2),
    radius: 16,
    score: 0,
    speed: isPlayer ? 3.1 : random(2.1, 3),
    color: isPlayer ? "#35d6ff" : colors[Math.floor(random(0, colors.length))],
    alive: true,
    respawn: 0,
  };
}

const state = {
  entities: [],
  orbs: [],
  playerId: null,
  tick: 0,
};

function resetGame() {
  state.entities = [createEntity("Toi", true)];
  state.playerId = state.entities[0].id;

  for (let i = 1; i <= BOT_COUNT; i += 1) {
    state.entities.push(createEntity(`Bot-${i}`));
  }

  state.orbs = Array.from({ length: ORB_COUNT }, createOrb);
  state.tick = 0;
}

function getPlayer() {
  return state.entities.find((e) => e.id === state.playerId);
}

function updatePlayer(entity) {
  const left = keys.has("a") || keys.has("q") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
  const up = keys.has("w") || keys.has("z") || keys.has("arrowup");
  const down = keys.has("s") || keys.has("arrowdown");
  const boost = keys.has("shift");

  let dx = 0;
  let dy = 0;

  if (left) dx -= 1;
  if (right) dx += 1;
  if (up) dy -= 1;
  if (down) dy += 1;

  const mag = Math.hypot(dx, dy) || 1;
  const maxSpeed = entity.speed * (boost ? 1.5 : 1);

  entity.vx = (dx / mag) * maxSpeed;
  entity.vy = (dy / mag) * maxSpeed;

  if (boost && entity.score > 0) {
    entity.score = Math.max(0, entity.score - 0.035);
    entity.radius = 16 + Math.sqrt(entity.score + 1) * 1.2;
  }
}

function closestOrb(from) {
  let best = null;
  let bestDist = Infinity;

  for (const orb of state.orbs) {
    const d = Math.hypot(from.x - orb.x, from.y - orb.y);
    if (d < bestDist) {
      bestDist = d;
      best = orb;
    }
  }

  return best;
}

function updateBot(entity) {
  const nearbyThreat = state.entities
    .filter((other) => other.id !== entity.id && other.alive && other.radius > entity.radius * 1.14)
    .sort((a, b) => Math.hypot(a.x - entity.x, a.y - entity.y) - Math.hypot(b.x - entity.x, b.y - entity.y))[0];

  const edibleTarget = state.entities
    .filter((other) => other.id !== entity.id && other.alive && entity.radius > other.radius * 1.1)
    .sort((a, b) => Math.hypot(a.x - entity.x, a.y - entity.y) - Math.hypot(b.x - entity.x, b.y - entity.y))[0];

  const orb = closestOrb(entity);

  let targetX = entity.x + Math.cos(entity.angle) * 120;
  let targetY = entity.y + Math.sin(entity.angle) * 120;

  if (nearbyThreat && Math.hypot(nearbyThreat.x - entity.x, nearbyThreat.y - entity.y) < 220) {
    targetX = entity.x - (nearbyThreat.x - entity.x);
    targetY = entity.y - (nearbyThreat.y - entity.y);
  } else if (edibleTarget && Math.random() > 0.2) {
    targetX = edibleTarget.x;
    targetY = edibleTarget.y;
  } else if (orb) {
    targetX = orb.x;
    targetY = orb.y;
  }

  const dx = targetX - entity.x;
  const dy = targetY - entity.y;
  const mag = Math.hypot(dx, dy) || 1;

  entity.vx = (dx / mag) * entity.speed;
  entity.vy = (dy / mag) * entity.speed;
  entity.angle = Math.atan2(dy, dx);
}

function eatOrbs(entity) {
  for (const orb of state.orbs) {
    if (Math.hypot(entity.x - orb.x, entity.y - orb.y) < entity.radius + 3) {
      entity.score += orb.value;
      entity.radius = 16 + Math.sqrt(entity.score + 1) * 1.2;
      orb.x = random(0, WORLD.width);
      orb.y = random(0, WORLD.height);
      orb.value = random(0.8, 1.6);
    }
  }
}

function resolveCollisions() {
  const alive = state.entities.filter((e) => e.alive);

  for (let i = 0; i < alive.length; i += 1) {
    for (let j = i + 1; j < alive.length; j += 1) {
      const a = alive[i];
      const b = alive[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);

      if (d > Math.max(a.radius, b.radius)) continue;

      const bigger = a.radius > b.radius ? a : b;
      const smaller = bigger === a ? b : a;

      if (bigger.radius < smaller.radius * 1.1) continue;

      bigger.score += smaller.score * 0.75 + 8;
      bigger.radius = 16 + Math.sqrt(bigger.score + 1) * 1.2;

      smaller.alive = false;
      smaller.respawn = 180;
      smaller.vx = 0;
      smaller.vy = 0;
    }
  }
}

function keepInBounds(entity) {
  entity.x = Math.max(entity.radius, Math.min(WORLD.width - entity.radius, entity.x));
  entity.y = Math.max(entity.radius, Math.min(WORLD.height - entity.radius, entity.y));
}

function tick() {
  state.tick += 1;

  for (const entity of state.entities) {
    if (!entity.alive) {
      entity.respawn -= 1;
      if (entity.respawn <= 0) {
        Object.assign(entity, createEntity(entity.name, entity.isPlayer));
        entity.id = entity.isPlayer ? state.playerId : entity.id;
      }
      continue;
    }

    if (entity.isPlayer) {
      updatePlayer(entity);
    } else {
      updateBot(entity);
    }

    entity.x += entity.vx;
    entity.y += entity.vy;
    keepInBounds(entity);
    eatOrbs(entity);
  }

  resolveCollisions();
  render();
  publishGameState();
  requestAnimationFrame(tick);
}

function camera() {
  const player = getPlayer();
  const fallback = { x: WORLD.width / 2, y: WORLD.height / 2 };
  const center = player?.alive ? player : fallback;

  return {
    x: center.x - canvas.width / 2,
    y: center.y - canvas.height / 2,
  };
}

function drawGrid(cam) {
  const size = 60;
  ctx.strokeStyle = "rgba(57, 81, 133, 0.35)";
  ctx.lineWidth = 1;

  for (let x = -((cam.x % size) + size); x < canvas.width; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = -((cam.y % size) + size); y < canvas.height; y += size) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function render() {
  const cam = camera();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid(cam);

  for (const orb of state.orbs) {
    const x = orb.x - cam.x;
    const y = orb.y - cam.y;

    if (x < -10 || y < -10 || x > canvas.width + 10 || y > canvas.height + 10) continue;

    ctx.fillStyle = orb.color;
    ctx.beginPath();
    ctx.arc(x, y, 3 + orb.value, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const entity of state.entities) {
    if (!entity.alive) continue;
    const x = entity.x - cam.x;
    const y = entity.y - cam.y;

    if (x < -50 || y < -50 || x > canvas.width + 50 || y > canvas.height + 50) continue;

    ctx.fillStyle = entity.color;
    ctx.beginPath();
    ctx.arc(x, y, entity.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(entity.name, x, y + 4);
  }

  renderHud();
}

function renderHud() {
  const ranking = [...state.entities].sort((a, b) => b.score - a.score);
  leaderboardEl.innerHTML = "";

  ranking.forEach((entity, i) => {
    const item = document.createElement("li");
    const isPlayer = entity.id === state.playerId;

    item.textContent = `${i + 1}. ${entity.name} — ${entity.score.toFixed(1)} pts`;
    if (isPlayer) item.classList.add("player");
    if (!entity.alive) item.classList.add("dead");
    leaderboardEl.appendChild(item);
  });

  const player = getPlayer();
  if (!player) return;

  statsEl.textContent = player.alive
    ? `Score: ${player.score.toFixed(1)} | Taille: ${player.radius.toFixed(1)} | Position: (${Math.round(player.x)}, ${Math.round(player.y)})`
    : `Tu as été mangé. Respawn dans ${Math.ceil(player.respawn / 60)}s`;
}

function publishGameState() {
  const snapshot = {
    tick: state.tick,
    playerId: state.playerId,
    entities: state.entities.map((e) => ({
      id: e.id,
      name: e.name,
      x: e.x,
      y: e.y,
      radius: e.radius,
      score: e.score,
      alive: e.alive,
    })),
    orbs: state.orbs.map((o) => ({ x: o.x, y: o.y, value: o.value })),
  };

  window.gameState = snapshot;
}

document.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

restartButton.addEventListener("click", () => {
  resetGame();
});

resetGame();
requestAnimationFrame(tick);
