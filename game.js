const canvas = document.getElementById("pong");
const ctx = canvas.getContext("2d");
const restartBtn = document.getElementById("restart");
const levelTitleEl = document.getElementById("level-title");
const levelSubtitleEl = document.getElementById("level-subtitle");
const controlsHintEl = document.getElementById("controls-hint");

const MAX_LEVEL = 5;
const LEVEL_TARGET_SCORE = 3;

const COLORS = {
  bg: "#020617",
  courtLine: "#334155",
  text: "#f8fafc",
  ball: "#38bdf8",
  dangerBall: "#ef4444",
  obstacle: "#f59e0b",
  paddle: "#e2e8f0",
};

const state = {
  running: true,
  gameWon: false,
  level: 1,
  playerScore: 0,
  aiScore: 0,
  message: "",
  messageTimer: 0,
  keys: {
    w: false,
    s: false,
    a: false,
    d: false,
    up: false,
    down: false,
    left: false,
    right: false,
  },
  obstacles: [],
};

const paddle = {
  width: 14,
  height: 110,
  speed: 520,
};

const player = {
  x: 20,
  y: canvas.height / 2 - paddle.height / 2,
};

const ai = {
  x: canvas.width - 20 - paddle.width,
  y: canvas.height / 2 - paddle.height / 2,
  speed: 430,
};

const aiWing = {
  x: canvas.width - 20 - paddle.width,
  y: canvas.height / 2 + 70,
  speed: 390,
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 14,
  vx: 0,
  vy: 0,
  baseSpeed: 390,
};

const deathBall = {
  active: false,
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 18,
  vx: 0,
  vy: 0,
  speed: 160,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function showMessage(text, seconds = 1.5) {
  state.message = text;
  state.messageTimer = seconds;
}

function setHudText() {
  levelTitleEl.textContent = `Pong: Level ${state.level}`;

  const levelDescriptions = {
    1: "Get to 3 points. If CPU scores once, Level 1 resets.",
    2: "Obstacles appear and create random bounces.",
    3: "Paddles can move in all directions.",
    4: "A slow red death ball can eliminate you on touch.",
    5: "CPU now controls 2 paddles.",
  };

  levelSubtitleEl.textContent = levelDescriptions[state.level];

  if (state.level >= 3) {
    controlsHintEl.innerHTML =
      "Move with <strong>W/A/S/D</strong> or <strong>Arrow Keys</strong>.";
  } else {
    controlsHintEl.innerHTML =
      "Move with <strong>W/S</strong> or <strong>Arrow Up/Arrow Down</strong>.";
  }
}

function randomSign() {
  return Math.random() > 0.5 ? 1 : -1;
}

function resetBall(direction = randomSign()) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;

  const angle = (Math.random() * Math.PI) / 3 - Math.PI / 6;
  ball.vx = Math.cos(angle) * ball.baseSpeed * direction;
  ball.vy = Math.sin(angle) * ball.baseSpeed;
}

function resetDeathBall() {
  deathBall.active = state.level >= 4;
  if (!deathBall.active) return;

  deathBall.x = canvas.width * 0.45;
  deathBall.y = canvas.height * 0.35;
  const angle = Math.random() * Math.PI * 2;
  deathBall.vx = Math.cos(angle) * deathBall.speed;
  deathBall.vy = Math.sin(angle) * deathBall.speed;
}

function buildLevelObstacles() {
  state.obstacles = [];
  if (state.level < 2) return;

  const count = 2;
  for (let i = 0; i < count; i += 1) {
    state.obstacles.push({
      x: canvas.width * (0.35 + Math.random() * 0.3),
      y: canvas.height * (0.2 + Math.random() * 0.6),
      size: 30 + Math.random() * 20,
    });
  }
}

function resetPaddles() {
  player.x = 20;
  player.y = canvas.height / 2 - paddle.height / 2;

  ai.x = canvas.width - 20 - paddle.width;
  ai.y = canvas.height / 2 - paddle.height / 2;

  aiWing.x = canvas.width - 70 - paddle.width;
  aiWing.y = canvas.height / 2 + 60;
}

function resetRound(direction = randomSign()) {
  resetPaddles();
  resetBall(direction);
  resetDeathBall();
}

function resetLevel(level = state.level) {
  state.level = clamp(level, 1, MAX_LEVEL);
  state.playerScore = 0;
  state.aiScore = 0;
  state.running = true;
  state.gameWon = false;
  buildLevelObstacles();
  resetRound();
  setHudText();
}

function resetEntireGame() {
  showMessage("New run started at Level 1.", 1.6);
  resetLevel(1);
}

function handleInput(dt) {
  const allowHorizontal = state.level >= 3;

  if (state.keys.w || state.keys.up) player.y -= paddle.speed * dt;
  if (state.keys.s || state.keys.down) player.y += paddle.speed * dt;

  if (allowHorizontal) {
    if (state.keys.a || state.keys.left) player.x -= paddle.speed * dt;
    if (state.keys.d || state.keys.right) player.x += paddle.speed * dt;
  }

  player.y = clamp(player.y, 0, canvas.height - paddle.height);

  const minX = 0;
  const maxX = canvas.width - paddle.width;
  player.x = clamp(player.x, minX, maxX);
}

function aiMoveToward(entity, target, dt, speedScale = 1) {
  const centerX = entity.x + paddle.width / 2;
  const centerY = entity.y + paddle.height / 2;

  const dx = target.x - centerX;
  const dy = target.y - centerY;

  const sx = Math.sign(dx) * ai.speed * speedScale * dt;
  const sy = Math.sign(dy) * ai.speed * speedScale * dt;

  if (Math.abs(dx) > 8) entity.x += sx;
  if (Math.abs(dy) > 8) entity.y += sy;

  const xPadding = state.level >= 3 ? 0 : canvas.width - 120;
  entity.x = clamp(entity.x, xPadding, canvas.width - paddle.width);
  entity.y = clamp(entity.y, 0, canvas.height - paddle.height);
}

function updateAi(dt) {
  aiMoveToward(ai, { x: ball.x, y: ball.y }, dt, 1);

  if (state.level >= 5) {
    aiMoveToward(aiWing, { x: ball.x, y: ball.y + 40 }, dt, 0.9);
  }
}

function collideBallWithPaddle(paddleObj, isPlayerPaddle) {
  const inX =
    ball.x - ball.size / 2 < paddleObj.x + paddle.width &&
    ball.x + ball.size / 2 > paddleObj.x;

  const inY =
    ball.y + ball.size / 2 > paddleObj.y &&
    ball.y - ball.size / 2 < paddleObj.y + paddle.height;

  if (!inX || !inY) return false;

  const offset =
    (ball.y - (paddleObj.y + paddle.height / 2)) / (paddle.height / 2);
  const bounceAngle = offset * (Math.PI / 2.8);

  const speed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.03, 760);

  const centerX = paddleObj.x + paddle.width / 2;
  const direction = ball.x < centerX ? -1 : 1;

  ball.vx = Math.cos(bounceAngle) * speed * direction;
  ball.vy = Math.sin(bounceAngle) * speed;

  if (isPlayerPaddle && state.level < 3) {
    ball.vx = Math.abs(ball.vx);
  }

  return true;
}

function collideBallWithObstacle(obstacle) {
  const half = obstacle.size / 2;
  const closestX = clamp(ball.x, obstacle.x - half, obstacle.x + half);
  const closestY = clamp(ball.y, obstacle.y - half, obstacle.y + half);

  const dx = ball.x - closestX;
  const dy = ball.y - closestY;

  if (dx * dx + dy * dy > (ball.size / 2) ** 2) return false;

  if (Math.abs(dx) > Math.abs(dy)) {
    ball.vx *= -1;
  } else {
    ball.vy *= -1;
  }

  const nudge = 22;
  ball.vx += (Math.random() - 0.5) * nudge;
  ball.vy += (Math.random() - 0.5) * nudge;
  return true;
}

function pointToAi() {
  state.aiScore += 1;

  if (state.level === 1 && state.aiScore >= 1) {
    showMessage("CPU scored once. Level 1 reset!", 1.8);
    resetLevel(1);
    return;
  }

  resetBall(1);
}

function pointToPlayer() {
  state.playerScore += 1;
  if (state.playerScore >= LEVEL_TARGET_SCORE) {
    if (state.level >= MAX_LEVEL) {
      state.gameWon = true;
      state.running = false;
      showMessage("You cleared all 5 levels!", 4);
    } else {
      const nextLevel = state.level + 1;
      showMessage(`Level ${state.level} cleared! Starting Level ${nextLevel}.`, 2.2);
      resetLevel(nextLevel);
    }
    return;
  }

  resetBall(-1);
}

function updateDeathBall(dt) {
  if (!deathBall.active) return;

  deathBall.x += deathBall.vx * dt;
  deathBall.y += deathBall.vy * dt;

  if (deathBall.x - deathBall.size / 2 <= 0 || deathBall.x + deathBall.size / 2 >= canvas.width) {
    deathBall.vx *= -1;
    deathBall.x = clamp(deathBall.x, deathBall.size / 2, canvas.width - deathBall.size / 2);
  }

  if (deathBall.y - deathBall.size / 2 <= 0 || deathBall.y + deathBall.size / 2 >= canvas.height) {
    deathBall.vy *= -1;
    deathBall.y = clamp(deathBall.y, deathBall.size / 2, canvas.height - deathBall.size / 2);
  }

  const dx = player.x + paddle.width / 2 - deathBall.x;
  const dy = player.y + paddle.height / 2 - deathBall.y;
  const collisionRadius = deathBall.size / 2 + Math.max(paddle.width, paddle.height) * 0.25;

  if (dx * dx + dy * dy <= collisionRadius * collisionRadius) {
    showMessage("You touched the red ball and died. Retry level!", 2.2);
    resetLevel(state.level);
  }
}

function updateBall(dt) {
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.y - ball.size / 2 <= 0 || ball.y + ball.size / 2 >= canvas.height) {
    ball.vy *= -1;
    ball.y = clamp(ball.y, ball.size / 2, canvas.height - ball.size / 2);
  }

  if (state.level >= 3 && (ball.x - ball.size / 2 <= 0 || ball.x + ball.size / 2 >= canvas.width)) {
    ball.vx *= -1;
    ball.x = clamp(ball.x, ball.size / 2, canvas.width - ball.size / 2);
  }

  collideBallWithPaddle(player, true);
  collideBallWithPaddle(ai, false);

  if (state.level >= 5) {
    collideBallWithPaddle(aiWing, false);
  }

  if (state.level >= 2) {
    for (const obstacle of state.obstacles) {
      collideBallWithObstacle(obstacle);
    }
  }

  if (state.level < 3) {
    if (ball.x + ball.size / 2 < 0) {
      pointToAi();
      return;
    }

    if (ball.x - ball.size / 2 > canvas.width) {
      pointToPlayer();
      return;
    }
  } else {
    // In free-move levels, score when ball reaches either side corridor.
    if (ball.x < 8) pointToAi();
    if (ball.x > canvas.width - 8) pointToPlayer();
  }
}

function updateTimers(dt) {
  if (state.messageTimer > 0) {
    state.messageTimer -= dt;
    if (state.messageTimer <= 0) {
      state.message = "";
      state.messageTimer = 0;
    }
  }
}

function drawCourt() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = COLORS.courtLine;
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 14]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPaddle(entity, color = COLORS.paddle) {
  ctx.fillStyle = color;
  ctx.fillRect(entity.x, entity.y, paddle.width, paddle.height);
}

function drawBall() {
  ctx.fillStyle = COLORS.ball;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawDeathBall() {
  if (!deathBall.active) return;

  ctx.fillStyle = COLORS.dangerBall;
  ctx.beginPath();
  ctx.arc(deathBall.x, deathBall.y, deathBall.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawObstacles() {
  if (state.level < 2) return;

  for (const obstacle of state.obstacles) {
    const half = obstacle.size / 2;
    ctx.fillStyle = COLORS.obstacle;
    ctx.fillRect(obstacle.x - half, obstacle.y - half, obstacle.size, obstacle.size);
  }
}

function drawScore() {
  ctx.fillStyle = COLORS.text;
  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";
  ctx.fillText(state.playerScore, canvas.width * 0.25, 70);
  ctx.fillText(state.aiScore, canvas.width * 0.75, 70);

  ctx.font = "bold 24px Arial";
  ctx.fillText(`Level ${state.level} — First to ${LEVEL_TARGET_SCORE}`, canvas.width / 2, 36);
}

function drawOverlay() {
  if (state.running && !state.message) return;

  if (!state.running || state.message) {
    ctx.fillStyle = "rgba(2, 6, 23, 0.62)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.fillStyle = COLORS.text;
  ctx.textAlign = "center";

  if (state.gameWon) {
    ctx.font = "bold 54px Arial";
    ctx.fillText("You beat all levels!", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "28px Arial";
    ctx.fillText("Press Restart Match to play again.", canvas.width / 2, canvas.height / 2 + 30);
    return;
  }

  if (state.message) {
    ctx.font = "bold 34px Arial";
    ctx.fillText(state.message, canvas.width / 2, canvas.height / 2);
  }
}

let lastTime = performance.now();
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.04);
  lastTime = timestamp;

  if (state.running) {
    handleInput(dt);
    updateAi(dt);
    updateBall(dt);
    updateDeathBall(dt);
  }

  updateTimers(dt);

  drawCourt();
  drawObstacles();
  drawPaddle(player, "#dbeafe");
  drawPaddle(ai, "#f8fafc");
  if (state.level >= 5) drawPaddle(aiWing, "#cbd5e1");
  drawBall();
  drawDeathBall();
  drawScore();
  drawOverlay();

  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === "w") state.keys.w = true;
  if (key === "s") state.keys.s = true;
  if (key === "a") state.keys.a = true;
  if (key === "d") state.keys.d = true;

  if (event.key === "ArrowUp") state.keys.up = true;
  if (event.key === "ArrowDown") state.keys.down = true;
  if (event.key === "ArrowLeft") state.keys.left = true;
  if (event.key === "ArrowRight") state.keys.right = true;
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();

  if (key === "w") state.keys.w = false;
  if (key === "s") state.keys.s = false;
  if (key === "a") state.keys.a = false;
  if (key === "d") state.keys.d = false;

  if (event.key === "ArrowUp") state.keys.up = false;
  if (event.key === "ArrowDown") state.keys.down = false;
  if (event.key === "ArrowLeft") state.keys.left = false;
  if (event.key === "ArrowRight") state.keys.right = false;
});

restartBtn.addEventListener("click", () => {
  resetEntireGame();
});

resetEntireGame();
requestAnimationFrame(gameLoop);
