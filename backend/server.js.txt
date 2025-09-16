// backend/server.js - minimal Node.js server
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.get('/', (req, res) => res.send('AI Video Friend Backend'));

io.on('connection', (socket) => {
  console.log('client connected', socket.id);

  socket.on('audio_chunk', (data) => {
    console.log('received audio chunk (size):', data && data.audioBase64 ? data.audioBase64.length : 0);
    // TODO: send to ASR -> LLM -> TTS pipeline
    socket.emit('tts_audio', { audioBase64: '' }); // placeholder
  });

  socket.on('disconnect', () => console.log('client disconnected', socket.id));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
