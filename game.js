const GRID_SIZE = 20;
const TICK_MS = 150;
const START_LENGTH = 3;
const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const board = document.getElementById("board");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const restartBtn = document.getElementById("restart-btn");
const touchButtons = document.querySelectorAll("[data-dir]");

let loopId = null;
let state = null;
let highScore = 0;
let isPaused = false;
let pendingDirection = null;

function createInitialState(rng = Math.random) {
  const center = Math.floor(GRID_SIZE / 2);
  const snake = Array.from({ length: START_LENGTH }, (_, index) => ({
    x: center - index,
    y: center,
  }));
  return {
    snake,
    direction: "right",
    food: spawnFood(snake, rng),
    score: 0,
    gameOver: false,
  };
}

function spawnFood(snake, rng = Math.random) {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const open = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        open.push({ x, y });
      }
    }
  }
  const choice = open[Math.floor(rng() * open.length)];
  return choice ?? { x: 0, y: 0 };
}

function isOpposite(dir, nextDir) {
  return (
    (dir === "up" && nextDir === "down") ||
    (dir === "down" && nextDir === "up") ||
    (dir === "left" && nextDir === "right") ||
    (dir === "right" && nextDir === "left")
  );
}

function step(currentState, inputDirection, rng = Math.random) {
  if (currentState.gameOver) {
    return currentState;
  }

  const direction = inputDirection && !isOpposite(currentState.direction, inputDirection)
    ? inputDirection
    : currentState.direction;
  const vector = DIRECTIONS[direction];
  const head = currentState.snake[0];
  const nextHead = { x: head.x + vector.x, y: head.y + vector.y };

  const hitWall =
    nextHead.x < 0 ||
    nextHead.x >= GRID_SIZE ||
    nextHead.y < 0 ||
    nextHead.y >= GRID_SIZE;

  const hitSelf = currentState.snake.some(
    (segment, index) => index !== 0 && segment.x === nextHead.x && segment.y === nextHead.y
  );

  if (hitWall || hitSelf) {
    return { ...currentState, direction, gameOver: true };
  }

  const ateFood = nextHead.x === currentState.food.x && nextHead.y === currentState.food.y;
  const nextSnake = [nextHead, ...currentState.snake];
  if (!ateFood) {
    nextSnake.pop();
  }

  return {
    snake: nextSnake,
    direction,
    food: ateFood ? spawnFood(nextSnake, rng) : currentState.food,
    score: ateFood ? currentState.score + 1 : currentState.score,
    gameOver: false,
  };
}

function renderBoard(currentState) {
  board.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const snakePositions = new Map(
    currentState.snake.map((segment, index) => [`${segment.x},${segment.y}`, index])
  );

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      const key = `${x},${y}`;
      if (snakePositions.has(key)) {
        cell.classList.add("cell--snake");
        if (snakePositions.get(key) === 0) {
          cell.classList.add("cell--head");
        }
      }
      if (currentState.food.x === x && currentState.food.y === y) {
        cell.classList.add("cell--food");
      }
      fragment.appendChild(cell);
    }
  }

  board.appendChild(fragment);
}

function updateUI(currentState) {
  scoreEl.textContent = currentState.score;
  if (currentState.score > highScore) {
    highScore = currentState.score;
    highScoreEl.textContent = highScore;
  }
  statusEl.textContent = currentState.gameOver
    ? "Game over. Press Restart to try again."
    : isPaused
      ? "Paused."
      : "Good luck!";
  pauseBtn.textContent = isPaused ? "Resume" : "Pause";
  pauseBtn.disabled = !state || state.gameOver;
  restartBtn.disabled = !state;
}

function tick() {
  state = step(state, pendingDirection);
  pendingDirection = null;
  renderBoard(state);
  updateUI(state);
  if (state.gameOver) {
    stopLoop();
  }
}

function startLoop() {
  if (loopId) {
    return;
  }
  loopId = setInterval(tick, TICK_MS);
}

function stopLoop() {
  if (loopId) {
    clearInterval(loopId);
    loopId = null;
  }
}

function startGame() {
  state = createInitialState();
  isPaused = false;
  pendingDirection = null;
  renderBoard(state);
  updateUI(state);
  startLoop();
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  restartBtn.disabled = false;
}

function restartGame() {
  stopLoop();
  startBtn.disabled = false;
  startGame();
}

function togglePause() {
  if (!state || state.gameOver) {
    return;
  }
  isPaused = !isPaused;
  if (isPaused) {
    stopLoop();
  } else {
    startLoop();
  }
  updateUI(state);
}

function setDirection(nextDir) {
  if (!state || state.gameOver) {
    return;
  }
  if (nextDir && !isOpposite(state.direction, nextDir)) {
    pendingDirection = nextDir;
  }
}

function handleKey(event) {
  const key = event.key.toLowerCase();
  if (key === " ") {
    event.preventDefault();
    togglePause();
    return;
  }
  if (key === "r") {
    restartGame();
    return;
  }
  const map = {
    arrowup: "up",
    w: "up",
    arrowdown: "down",
    s: "down",
    arrowleft: "left",
    a: "left",
    arrowright: "right",
    d: "right",
  };
  if (map[key]) {
    event.preventDefault();
    setDirection(map[key]);
  }
}

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", restartGame);
document.addEventListener("keydown", handleKey);
touchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDirection(button.dataset.dir);
  });
});

state = createInitialState();
renderBoard(state);
updateUI(state);
