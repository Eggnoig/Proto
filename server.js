const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'Public')));

// Explicit route for "/"
app.get("/:boardId", (req, res) => {
    res.sendFile(path.join(__dirname, "Public", "index.html"));
});
app.get("/", (req, res) => {
    const id = Math.random().toString(36).substring(2, 8);
    res.redirect(`/${id}`);
});

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  const rawBoardId = socket.handshake.query.boardId;
  const boardId = typeof rawBoardId === 'string' && rawBoardId.trim()
    ? rawBoardId.trim()
    : 'default-board';
  socket.join(boardId);
  socket.data.boardId = boardId;
  console.log(`Client ${socket.id} joined board ${boardId}`);

  socket.on('draw', (data) => {
    socket.to(socket.data.boardId).emit('draw', data);
  });

  socket.on('clear', (data) => {
    socket.to(socket.data.boardId).emit('clear', data);
  });

  // NEW: text events
  socket.on('text_create', (data) => {
    socket.to(socket.data.boardId).emit('text_create', data);
  });

  socket.on('text_update', (data) => {
    socket.to(socket.data.boardId).emit('text_update', data);
  });

  socket.on('text_move', (data) => {
    socket.to(socket.data.boardId).emit('text_move', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Collab workspace server running on port ${PORT}`);
});
