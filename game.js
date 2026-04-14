const canvas = document.getElementById("pong");
const ctx = canvas.getContext("2d");
const restartBtn = document.getElementById("restart");

const LEVEL_TARGET_SCORE = 5;

const state = {
  running: true,
  playerScore: 0,
  aiScore: 0,
  winner: null,
  keys: {
    w: false,
    s: false,
    up: false,
    down: false,
  },
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

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 14,
  vx: 0,
  vy: 0,
  baseSpeed: 380,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetBall(direction = 1) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;

  const angle = (Math.random() * Math.PI) / 3 - Math.PI / 6;
  ball.vx = Math.cos(angle) * ball.baseSpeed * direction;
  ball.vy = Math.sin(angle) * ball.baseSpeed;
}

function resetMatch() {
  state.playerScore = 0;
  state.aiScore = 0;
  state.winner = null;
  state.running = true;

  player.y = canvas.height / 2 - paddle.height / 2;
  ai.y = canvas.height / 2 - paddle.height / 2;

  resetBall(Math.random() > 0.5 ? 1 : -1);
}

function handleInput(dt) {
  if (state.keys.w || state.keys.up) {
    player.y -= paddle.speed * dt;
  }
  if (state.keys.s || state.keys.down) {
    player.y += paddle.speed * dt;
  }

  player.y = clamp(player.y, 0, canvas.height - paddle.height);
}

function updateAi(dt) {
  const aiCenter = ai.y + paddle.height / 2;
  const targetY = ball.y;

  if (Math.abs(targetY - aiCenter) > 10) {
    ai.y += Math.sign(targetY - aiCenter) * ai.speed * dt;
  }

  ai.y = clamp(ai.y, 0, canvas.height - paddle.height);
}

function collidePaddle(paddleObj, isPlayer) {
  const inX =
    ball.x - ball.size / 2 < paddleObj.x + paddle.width &&
    ball.x + ball.size / 2 > paddleObj.x;

  const inY =
    ball.y + ball.size / 2 > paddleObj.y &&
    ball.y - ball.size / 2 < paddleObj.y + paddle.height;

  if (!inX || !inY) {
    return;
  }

  const offset =
    (ball.y - (paddleObj.y + paddle.height / 2)) / (paddle.height / 2);
  const bounceAngle = offset * (Math.PI / 3);

  const speed = Math.hypot(ball.vx, ball.vy) * 1.03;
  const direction = isPlayer ? 1 : -1;

  ball.vx = Math.cos(bounceAngle) * speed * direction;
  ball.vy = Math.sin(bounceAngle) * speed;

  if (isPlayer) {
    ball.x = paddleObj.x + paddle.width + ball.size / 2;
  } else {
    ball.x = paddleObj.x - ball.size / 2;
  }
}

function updateBall(dt) {
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.y - ball.size / 2 <= 0) {
    ball.y = ball.size / 2;
    ball.vy *= -1;
  }

  if (ball.y + ball.size / 2 >= canvas.height) {
    ball.y = canvas.height - ball.size / 2;
    ball.vy *= -1;
  }

  collidePaddle(player, true);
  collidePaddle(ai, false);

  if (ball.x + ball.size / 2 < 0) {
    state.aiScore += 1;
    checkLevelEnd();
    resetBall(1);
  }

  if (ball.x - ball.size / 2 > canvas.width) {
    state.playerScore += 1;
    checkLevelEnd();
    resetBall(-1);
  }
}

function checkLevelEnd() {
  if (state.playerScore >= LEVEL_TARGET_SCORE) {
    state.winner = "You";
    state.running = false;
  } else if (state.aiScore >= LEVEL_TARGET_SCORE) {
    state.winner = "CPU";
    state.running = false;
  }
}

function drawCourt() {
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 14]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPaddle(entity) {
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(entity.x, entity.y, paddle.width, paddle.height);
}

function drawBall() {
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawScore() {
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.fillText(state.playerScore, canvas.width * 0.25, 70);
  ctx.fillText(state.aiScore, canvas.width * 0.75, 70);

  ctx.font = "bold 24px Arial";
  ctx.fillText("Level 1: First to 5", canvas.width / 2, 36);
}

function drawEndState() {
  if (!state.winner) {
    return;
  }

  ctx.fillStyle = "rgba(2, 6, 23, 0.78)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.font = "bold 54px Arial";
  ctx.fillText(`${state.winner} wins Level 1!`, canvas.width / 2, canvas.height / 2 - 16);
  ctx.font = "28px Arial";
  ctx.fillText("Press Restart Match for another round", canvas.width / 2, canvas.height / 2 + 36);
}

let lastTime = performance.now();
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.0167 * 2.2);
  lastTime = timestamp;

  if (state.running) {
    handleInput(dt);
    updateAi(dt);
    updateBall(dt);
  }

  drawCourt();
  drawPaddle(player);
  drawPaddle(ai);
  drawBall();
  drawScore();
  drawEndState();

  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === "w") state.keys.w = true;
  if (key === "s") state.keys.s = true;
  if (event.key === "ArrowUp") state.keys.up = true;
  if (event.key === "ArrowDown") state.keys.down = true;
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();

  if (key === "w") state.keys.w = false;
  if (key === "s") state.keys.s = false;
  if (event.key === "ArrowUp") state.keys.up = false;
  if (event.key === "ArrowDown") state.keys.down = false;
});

restartBtn.addEventListener("click", () => {
  resetMatch();
});

resetMatch();
requestAnimationFrame(gameLoop);
