const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(express.json());
app.use(cors({ origin: '*' }));

mongoose.connect('mongodb+srv://moreshital694:ocj0OSoXKXiRzRgP@cluster0.4aogt8i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
    content: String,
    username: String,
    timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', messageSchema);

// Register API Endpoint
app.post('/register', async(req, res) => {
    const { username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login API Endpoint
app.post('/login', async(req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        res.status(200).json({ message: 'Login successful', username: user.username });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Socket.IO Logic
// Socket.IO Logic (from your earlier backend code)
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('setUsername', async(username) => {
        socket.username = username;
        console.log(`Username set for ${socket.id}: ${username}`);

        try {
            const messages = await Message.find().sort({ timestamp: 1 });
            socket.emit('loadMessages', messages.map(msg => ({
                content: msg.content,
                username: msg.username,
                timestamp: msg.timestamp.toISOString()
            })));
        } catch (err) {
            console.error('Error loading messages:', err);
        }
    });

    socket.on('sendMessage', async(message) => {
        try {
            const newMessage = new Message({
                content: message,
                username: socket.username || 'Anonymous',
                timestamp: new Date()
            });
            await newMessage.save();
            io.emit('message', {
                content: message,
                username: socket.username || 'Anonymous',
                timestamp: newMessage.timestamp.toISOString()
            });
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
// Start Server
server.listen(5000, () => {
    console.log('Server running on port 5000');
});