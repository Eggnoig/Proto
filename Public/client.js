const socket = io(); // connects to same origin by default

const boardId = 'default-board'; // later: dynamic from URL, user, etc, static for now
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const colorPicker = document.getElementById('color-picker');
const widthPicker = document.getElementById('width-picker');
const clearBtn = document.getElementById('clear-btn');
const addTextBtn = document.getElementById('add-text-btn');
const boardContainer = document.getElementById('board-container');
const boardLabel = document.getElementById('board-id');
if (boardLabel) {
  boardLabel.textContent = `Board: ${boardId}`;
}

let drawing = false;
let lastX = 0;
let lastY = 0;
const strokes = [];
const textBoxes = [];

// Resize canvas to fill the viewport
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - document.querySelector('header').offsetHeight;
  redrawAllStrokes();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function redrawAllStrokes() { 
  ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) {
        drawLine(stroke.x0, stroke.y0, stroke.x1, stroke.y1, stroke.color, stroke.width); //redraws each stroke
    }
};
// Mouse events
canvas.addEventListener('mousedown', (e) => {
  drawing = true;
  const { x, y } = getMousePos(e);
  lastX = x;
  lastY = y;
});

canvas.addEventListener('mousemove', (e) => {
  if (!drawing) return;
  const { x, y } = getMousePos(e);

  const color = colorPicker.value;
  const width = parseInt(widthPicker.value, 10);

  // Draw locally
  drawLine(lastX, lastY, x, y, color, width);
  const stroke ={ 
    boardId,
    x0: lastX,
    y0: lastY,
    x1: x,
    y1: y,
    color,
    width
  };
  strokes.push(stroke);

  // Emit to others
  socket.emit('draw', {
    boardId,
    x0: lastX,
    y0: lastY,
    x1: x,
    y1: y,
    color,
    width
  });

  lastX = x;
  lastY = y;
});

canvas.addEventListener('mouseup', () => {
  drawing = false;
});

canvas.addEventListener('mouseleave', () => {
  drawing = false;
});

// Touch support (basic)
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  drawing = true;
  const touch = e.touches[0];
  const { x, y } = getTouchPos(touch);
  lastX = x;
  lastY = y;
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!drawing) return;
  const touch = e.touches[0];
  const { x, y } = getTouchPos(touch);

  const color = colorPicker.value;
  const width = parseInt(widthPicker.value, 10);

  drawLine(lastX, lastY, x, y, color, width);

  socket.emit('draw', {
    boardId,
    x0: lastX,
    y0: lastY,
    x1: x,
    y1: y,
    color,
    width
  });

  lastX = x;
  lastY = y;
});

canvas.addEventListener('touchend', () => {
  drawing = false;
});

clearBtn.addEventListener('click', () => {
  clearBoard();
  socket.emit('clear', { boardId });
});

function createLocalTextBox({ id, x, y, content }) {
  const el = document.createElement('div');
  el.className = 'text-box';
  el.contentEditable = 'true';
  el.dataset.id = id;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.innerText = content;

  // When user types, sync content
  el.addEventListener('input', () => {
    const newContent = el.innerText;
    if (!textBoxes[id]) return;
    textBoxes[id].content = newContent;

    socket.emit('text_update', {
      boardId,
      id,
      content: newContent
    });
  });

  // Simple dragging
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  el.addEventListener('mousedown', (e) => {
    // prevent starting a canvas draw when clicking a text box
    e.stopPropagation();
    dragging = true;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = boardContainer.getBoundingClientRect();
    const newX = e.clientX - rect.left - offsetX;
    const newY = e.clientY - rect.top - offsetY;

    el.style.left = `${newX}px`;
    el.style.top = `${newY}px`;

    if (textBoxes[id]) {
      textBoxes[id].x = newX;
      textBoxes[id].y = newY;
    }

    socket.emit('text_move', {
      boardId,
      id,
      x: newX,
      y: newY
    });
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
  });

  boardContainer.appendChild(el);
  return el;
}

// Add Text Box button
addTextBtn.addEventListener('click', () => {
  // Place roughly near the center
  const rect = boardContainer.getBoundingClientRect();
  const x = rect.width / 2 - 60;
  const y = rect.height / 2 - 20;

  const id = `text-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const content = 'New text';

  textBoxes[id] = { id, x, y, content };

  createLocalTextBox({ id, x, y, content });

  socket.emit('text_create', {
    boardId,
    id,
    x,
    y,
    content
  });
});



// Socket listeners
socket.on('draw', (data) => {
  // Another user’s stroke
  drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.width);
  strokes.push(data);
});

socket.on('clear', () => {
  clearBoard();
});

// When someone else creates a text box
socket.on('text_create', (data) => {
  if (textBoxes[data.id]) return;
  textBoxes[data.id] = {
    id: data.id,
    x: data.x,
    y: data.y,
    content: data.content
  };
  createLocalTextBox(data);
});

// When someone else changes text content
socket.on('text_update', (data) => {
  const box = textBoxes[data.id];
  if (!box) return;
  box.content = data.content;

  const el = document.querySelector(`.text-box[data-id="${data.id}"]`);
  if (el && el !== document.activeElement) {
    // Avoid fighting the user's caret if they're typing
    el.innerText = data.content;
  }
});

// When someone else moves the text box
socket.on('text_move', (data) => {
  const box = textBoxes[data.id];
  if (!box) return;
  box.x = data.x;
  box.y = data.y;

  const el = document.querySelector(`.text-box[data-id="${data.id}"]`);
  if (el) {
    el.style.left = `${data.x}px`;
    el.style.top = `${data.y}px`;
  }
});


// Helpers
function drawLine(x0, y0, x1, y1, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function clearBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  strokes.length = 0; //drops saved strokes
  const boxes = document.querySelectorAll('.text-box');
  boxes.forEach(box => box.remove());
    for (const key in textBoxes) {
        if (Object.prototype.hasOwnProperty.call(textBoxes, key)) {
            delete textBoxes[key];
        }
    }

}

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function getTouchPos(touch) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}
