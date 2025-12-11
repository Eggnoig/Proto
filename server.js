const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'Public')));

const docStore = new Map(); // in-memory store for document content

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'home.html'));
});

// Document redirects and editor
app.get('/docs', (req, res) => {
  const id = Math.random().toString(36).substring(2, 8);
  res.redirect(`/docs/${id}`);
});

app.get('/docs/:docId', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'document.html'));
});

// Board route (must remain last to avoid catching /docs)
app.get('/:boardId', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'index.html'));
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

  const isDocumentRoom = boardId.startsWith('doc-');

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

  socket.on('doc_update', (data = {}) => {
    if (!isDocumentRoom) return;
    const content = typeof data.content === 'string' ? data.content : '';
    docStore.set(boardId, content);
    socket.to(socket.data.boardId).emit('doc_update', { content });
  });

  socket.on('doc_sync_request', () => {
    if (!isDocumentRoom) return;
    const content = docStore.get(boardId) || '';
    socket.emit('doc_sync', { content });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Collab workspace server running on port ${PORT}`);
});
