const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const CELL_SIZE = 20;
const COLS = Math.floor(canvas.width / CELL_SIZE);
const ROWS = Math.floor(canvas.height / CELL_SIZE);

const GAME_STATE_MENU = "MENU";
const GAME_STATE_GAME = "GAME";

const MAP_EMPTY = "Empty";
const MAP_SQUARE = "Square";
const MAP_WALLS = "Walls";
const MAP_MAZE = "Maze";

const FOOD_NORMAL = "normal"
const FOOD_POWER = "power"
const FOOD_SLOW = "slow"

const MODE_CLASSIC = "Classic";
const MODE_CHAOS = "Chaos";

const MODES = [MODE_CLASSIC, MODE_CHAOS];
const MAPS = [MAP_EMPTY, MAP_SQUARE, MAP_WALLS, MAP_MAZE];

const SPEED_DEFAULT = 10;
const SPEED_SLOWED = 5

const DIR = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

let snake;
let direction;
let food;
let lastTime = 0;
let speed = SPEED_DEFAULT;
let gameOver = false;
let walls = [];
let powerMode = false;
let powerTimer = 0;
let slowMode = false;
let slowTimer = 0;

const POWER_DURATION = 6 * speed;
const SLOW_DURATION = 6 * speed;

let gameState = GAME_STATE_MENU;
let menuState = {
  options: ["Start Game", "Select Mode", "Select Map", "Exit"],
  selectedIndex: 0,
};
let selectedModeIndex = 0;
let selectedMapIndex = 0;

// ----------------- INIT -----------------
function init() {
  walls = generateWalls();
  snake = spawnSnake();
  food = spawnFood();
  gameOver = false;
  lastTime = 0;
  powerMode = 0;
  powerTimer = 0;
  slowMode = 0;
  slowTimer = 0;
}

// ----------------- SPAWN SNAKE -----------------
function spawnSnake(length=3) {
  const directions = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];

  while (true) {
    const headX = Math.floor(Math.random() * COLS);
    const headY = Math.floor(Math.random() * ROWS);

    if (walls.some((w) => w.x === headX && w.y === headY)) continue;

    const dir = directions[Math.floor(Math.random() * directions.length)];
    const snakeCandidate = [{ x: headX, y: headY }];
    let valid = true;

    for (let i = 1; i < length; i++) {
      const x = headX - dir.x * i;
      const y = headY - dir.y * i;

      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) {
        valid = false;
        break;
      }

      if (walls.some((w) => w.x === x && w.y === y)) {
        valid = false;
        break;
      }

      snakeCandidate.push({ x, y });
    }

    if (valid) {
      direction = dir; // стартовое направление
      return snakeCandidate;
    }
  }
}

// ----------------- SPAWN FOOD -----------------
function spawnFood() {
  while (true) {
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);

    const onSnake = snake.some(p => p.x === x && p.y === y);
    const onWall = walls.some(w => w.x === x && w.y === y);

    if (onSnake || onWall) continue;

    return {
      x,
      y,
      type: chooseFoodType(),
    };
  }
}

function chooseFoodType() {
  const rolls = [];

  rolls.push({ type: FOOD_POWER, weight: 2 });

  return weightedRandom(rolls);
}

function weightedRandom(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;

  for (let item of items) {
    if (r < item.weight) return item.type;
    r -= item.weight;
  }
}

// ----------------- GENERATE WALLS -----------------
function generateWalls() {
  let mapWalls = [];

  switch (MAPS[selectedMapIndex]) {
    case MAP_EMPTY:
      return [];
    case MAP_SQUARE:
      for (let x = 0; x < COLS; x++) {
        mapWalls.push({ x, y: 0 });
        mapWalls.push({ x, y: ROWS - 1 });
      }
      for (let y = 1; y < ROWS - 1; y++) {
        mapWalls.push({ x: 0, y });
        mapWalls.push({ x: COLS - 1, y });
      }
      return mapWalls;
    case MAP_WALLS:
      for (let y = 3; y < ROWS - 3; y++) {
        mapWalls.push({ x: Math.floor(COLS / 3), y: y });
        mapWalls.push({ x: Math.floor(COLS / 3) * 2, y: y });
      }

      return mapWalls;
    case MAP_MAZE:
        for (let x = 0; x < COLS; x++) { 
            mapWalls.push({ x, y: 0 }); 
            mapWalls.push({ x, y: ROWS - 1 }); 
        }
        for (let y = 1; y < ROWS - 1; y++) { 
            mapWalls.push({ x: 0, y }); 
            mapWalls.push({ x: COLS - 1, y }); 
        }

        let centerX = Math.floor(COLS / 2);
        let gapSize = 2;
        let offsets = [3, 7];
        offsets.forEach(off => {
            for (let x = off; x < COLS - off; x++) {
                let isCenterGap =
                x >= centerX - gapSize && x <= centerX + gapSize;

                if (!isCenterGap) {
                    mapWalls.push({ x, y: off });
                    mapWalls.push({ x, y: ROWS - 1 - off });
                }
            }

            for (let y = off; y < ROWS - off; y++) {
                let isMiddleGap =
                y >= Math.floor(ROWS / 2) - gapSize &&
                y <= Math.floor(ROWS / 2) + gapSize;

                if (!isMiddleGap) {
                    mapWalls.push({ x: off, y });
                    mapWalls.push({ x: COLS - 1 - off, y });
                }
            }
        });

        return mapWalls;
  }
}

// ----------------- INPUT -----------------
window.addEventListener("keydown", (e) => {
  if (gameState === GAME_STATE_MENU) {
    if (e.key === "ArrowUp") {
      menuState.selectedIndex--;
      if (menuState.selectedIndex < 0) menuState.selectedIndex = menuState.options.length - 1;
    } else if (e.key === "ArrowDown") {
      menuState.selectedIndex++;
      if (menuState.selectedIndex >= menuState.options.length) menuState.selectedIndex = 0;
    } else if (e.key === "Enter") {
      handleMenuSelect();
    }
    return;
  }

  if (gameState === GAME_STATE_GAME) {
    if (gameOver && e.key === "Enter") {
      gameState = GAME_STATE_MENU;
      return;
    }

    let newDir;
    switch (e.key) {
      case "ArrowUp":
      case "w":
        newDir = DIR.UP;
        break;
      case "ArrowDown":
      case "s":
        newDir = DIR.DOWN;
        break;
      case "ArrowLeft":
      case "a":
        newDir = DIR.LEFT;
        break;
      case "ArrowRight":
      case "d":
        newDir = DIR.RIGHT;
        break;
    }

    if (!newDir) return;

    if (direction.x + newDir.x === 0 && direction.y + newDir.y === 0) return;

    direction = newDir;
  }
});


// ----------------- MENU -----------------
function handleMenuSelect() {
  const option = menuState.options[menuState.selectedIndex];
  if (option === "Start Game") {
    init();
    gameState = GAME_STATE_GAME;
  } else if (option === "Select Mode") {
    selectedModeIndex = (selectedModeIndex + 1) % MODES.length;
  } else if (option === "Select Map") {
    selectedMapIndex = (selectedMapIndex + 1) % MAPS.length;
  } else if (option === "Exit") {
    alert("Goodbye!");
  }
}

// ----------------- LOOP -----------------
function loop(timestamp) {
  if (gameState === GAME_STATE_GAME) {
    if (timestamp - lastTime > 1000 / speed) {
      update();
      lastTime = timestamp;
    }
    drawGame();
  } else if (gameState === GAME_STATE_MENU) {
    drawMenu();
  }
  requestAnimationFrame(loop);
}

// ----------------- DRAW -----------------
function drawMenu() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1a1a1a");
  gradient.addColorStop(1, "#333");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";

  ctx.fillStyle = "#fff";
  ctx.font = "36px monospace";
  ctx.fillText("Snake Game", canvas.width / 2, 80);

  menuState.options.forEach((option, index) => {
    let color = index === menuState.selectedIndex ? "#ffeb3b" : "#fff";
    ctx.fillStyle = color;
    let text = option;
    if (option === "Select Mode") text += `: ${MODES[selectedModeIndex]}`;
    if (option === "Select Map") text += `: ${MAPS[selectedMapIndex]}`;
    ctx.font = index === menuState.selectedIndex ? "24px monospace" : "20px monospace";
    ctx.fillText(text, canvas.width / 2, 160 + index * 50);
  });

  ctx.font = "14px monospace";
  ctx.fillStyle = "#ccc";
  ctx.fillText("Use ↑↓ to navigate, Enter to select", canvas.width / 2, canvas.height - 40);
}

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#222";
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL_SIZE, 0);
    ctx.lineTo(x * CELL_SIZE, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL_SIZE);
    ctx.lineTo(canvas.width, y * CELL_SIZE);
    ctx.stroke();
  }

  const pulse = 0.2 * Math.sin(Date.now() / 200) + 1; // колебание от 0.8 до 1.2
  const size = CELL_SIZE * pulse;
  const offset = (CELL_SIZE - size) / 2;

  let foodGradient = ctx.createRadialGradient(
    food.x * CELL_SIZE + CELL_SIZE / 2,
    food.y * CELL_SIZE + CELL_SIZE / 2,
    size / 4,
    food.x * CELL_SIZE + CELL_SIZE / 2,
    food.y * CELL_SIZE + CELL_SIZE / 2,
    size / 2
  );
  switch (food.type) {
    case FOOD_POWER:
      foodGradient.addColorStop(0, "#d77fff");
      foodGradient.addColorStop(1, "#8a2be2");
      break;
    case FOOD_SLOW:
      foodGradient.addColorStop(0, "#ff70a0");
      foodGradient.addColorStop(1, "#db0276");
      break;
    default:
      foodGradient.addColorStop(0, "#ff6b6b");
      foodGradient.addColorStop(1, "#ff0000");
      break;
  }
  ctx.fillStyle = foodGradient;
  ctx.fillRect(
    food.x * CELL_SIZE + offset,
    food.y * CELL_SIZE + offset,
    size,
    size
  );

  for (let i = 0; i < snake.length; i++) {
    const part = snake[i];
    let gradient = ctx.createLinearGradient(
      part.x * CELL_SIZE, part.y * CELL_SIZE,
      part.x * CELL_SIZE + CELL_SIZE, part.y * CELL_SIZE + CELL_SIZE
    );

    if (powerMode) {
      const t = (Date.now() / 100) % 2;
      gradient.addColorStop(0, t < 1 ? "#00ffff" : "#00aaaa");
      gradient.addColorStop(1, t < 1 ? "#00aaaa" : "#00ffff");
    } else {
      gradient.addColorStop(0, "#a0ff7f");
      gradient.addColorStop(1, "#00ff00");
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(part.x * CELL_SIZE, part.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }

  ctx.shadowColor = "#000";
  ctx.shadowBlur = 4;
  ctx.fillStyle = "#eb8f34";
  for (let wall of walls) {
    ctx.fillRect(wall.x * CELL_SIZE, wall.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = "white";
  ctx.font = "20px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`Length: ${snake.length}`, 20, 35);

  if (gameOver) {
    ctx.fillStyle = "#fff";
    ctx.font = "40px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "20px monospace";
    ctx.fillText("Press Enter to return to menu", canvas.width / 2, canvas.height / 2 + 20);
  }
}


// ----------------- UPDATE -----------------
function update() {
  if (gameOver) return;

  let headX = snake[0].x + direction.x;
  let headY = snake[0].y + direction.y;

  if (headX < 0) headX = COLS - 1;
  if (headX >= COLS) headX = 0;
  if (headY < 0) headY = ROWS - 1;
  if (headY >= ROWS) headY = 0;

  const head = { x: headX, y: headY };

  for (let part of snake) {
    if (part.x === head.x && part.y === head.y) {
      gameOver = true;
      return;
    }
  }

  for (let i = walls.length - 1; i >= 0; i--) {
    if (walls[i].x === head.x && walls[i].y === head.y) {
        if (powerMode) {
          walls.splice(i, 1);
        } else {
          gameOver = true;
          return;
        }
    }
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    if (food.type === FOOD_POWER) {
        powerMode = true;
        powerTimer = POWER_DURATION;
    }
    
    if (food.type === FOOD_SLOW) {
        slowMode = true;
        slowTimer = SLOW_DURATION;
        speed = SPEED_SLOWED
    }

    food = spawnFood();
  } else {
    snake.pop();
  }

  if (powerMode) {
    powerTimer--;
    if (powerTimer <= 0) {
        powerMode = false;
    }
  }

  if (slowMode) {
    slowTimer--;
    if (slowTimer <= 0) {
        slowMode = false;
        speed = SPEED_DEFAULT
    }
  }
}

// ----------------- START -----------------
requestAnimationFrame(loop);
