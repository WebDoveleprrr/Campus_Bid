require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const chatRoutes = require('./routes/chats');
const analyticsRoutes = require('./routes/analytics');
const categoryRoutes = require('./routes/categories');
const messageRoutes = require('./routes/messages');
const favoriteRoutes = require('./routes/favorites');
const notificationRoutes = require('./routes/notifications');
const Product = require('./models/Product');
const Message = require('./models/Message');
const seedData = require('./utils/seedData');

connectDB().then(() => {
  seedData(); // Run seeder after db connection
});

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const app = express();
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.onrender.com');
    if (!isAllowed) {
      return callback(new Error('CORS Error: Origin not allowed'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));
app.use(express.json());

app.get('/api/seed', async (req, res) => {
  await seedData();
  res.send('Sample data inserted');
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve static uploads
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.onrender.com');
      if (!isAllowed) {
        return callback(new Error('CORS Error'), false);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});
app.set('io', io);

const userSockets = new Map();

// --- IN-MEMORY SANDBOX STATE ---
const sandboxListings = [
  { id: 'sb_1', title: 'Engineering Math Vol 1', price: 250, seller: 'Ghost_Reader', emoji: '📚', bids: [] },
  { id: 'sb_2', title: 'iPhone 12 Mini', price: 18000, seller: 'Guest_Apple', emoji: '📱', bids: [] },
  { id: 'sb_3', title: 'Acoustic Guitar', price: 1200, seller: 'Phantom_Musician', emoji: '🎸', bids: [] },
  { id: 'sb_4', title: 'Sony Headset', price: 9500, seller: 'Ghost_Bass', emoji: '🎧', bids: [] }
];

io.on('connection', (socket) => {
  console.log('User connected', socket.id);

  // --- SANDBOX EVENTS ---
  socket.on('sandbox_join', (ghostName) => {
    socket.join('sandbox_room');
    socket.ghostName = ghostName;
    socket.emit('sandbox_snapshot', sandboxListings);
    io.to('sandbox_room').emit('sandbox_ticker', { text: `👀 ${ghostName} just joined the sandbox.` });
  });

  socket.on('sandbox_simulate_listing', (data) => {
    const emojis = ['💻', '🚲', '👟', '🎮', '⌚'];
    const newListing = {
      id: `sb_${Date.now()}`,
      title: data.title,
      price: Number(data.price),
      seller: socket.ghostName || 'Anonymous',
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      bids: []
    };
    sandboxListings.unshift(newListing); // Add to top
    if (sandboxListings.length > 20) sandboxListings.pop(); // Keep memory trim

    io.to('sandbox_room').emit('sandbox_new_listing', newListing);
    io.to('sandbox_room').emit('sandbox_ticker', { text: `🚀 ${newListing.seller} just listed "${newListing.title}" for ₹${newListing.price}` });
  });

  socket.on('sandbox_place_bid', (data) => {
    const { listingId, amount } = data;
    const listing = sandboxListings.find(l => l.id === listingId);
    if (!listing) return;

    if (amount <= listing.price) {
      return socket.emit('bid_error', { message: 'Mock bid must be higher than current price' });
    }

    listing.price = amount;
    listing.bids.push({ amount, bidder: socket.ghostName });

    io.to('sandbox_room').emit('sandbox_bid_update', { listingId, newPrice: amount, bidder: socket.ghostName });
    io.to('sandbox_room').emit('sandbox_ticker', { text: `🔥 ${socket.ghostName} placed a ₹${amount} bid on "${listing.title}"!` });
  });

  socket.on('identify', (userId) => {
    userSockets.set(userId, socket.id);
    socket.userId = userId;
    console.log(`User ${userId} identified with socket ${socket.id}`);
  });

  socket.on('join_product_room', (productId) => {
    socket.join(productId);
    console.log(`User ${socket.id} joined room: ${productId}`);
  });

  socket.on('place_bid', async (data) => {
    const { productId, bidderId, amount, username } = data;
    try {
      const product = await Product.findById(productId);
      if (!product) return;

      const highestPrice = product.currentPrice || product.basePrice;
      if (amount <= highestPrice) {
        return socket.emit('bid_error', { message: 'Bid amount must be strictly greater than current highest price' });
      }

      const previousBidderId = product.bids.length > 0 ? product.bids[product.bids.length - 1].bidder : null;

      product.currentPrice = amount;
      product.bids.push({ amount, bidder: bidderId });
      await product.save();

      io.to(productId).emit('new_bid', {
        productId: product._id.toString(),
        currentPrice: product.currentPrice,
        amount,
        bidder: username,
        bids: product.bids.map(b => ({
          amount: b.amount,
          bidder: b.bidder?.username || username
        })),
        timestamp: new Date()
      });

      io.emit('global_ticker', { text: `📢 @${username} just placed a ₹${amount} bid on "${product.title}"!` });

      // Notify previous bidder globally if they are connected
      if (previousBidderId && String(previousBidderId) !== String(bidderId)) {
        const prevSocketId = userSockets.get(String(previousBidderId));
        if (prevSocketId) {
          io.to(prevSocketId).emit('notification', {
            type: 'outbid',
            message: `You've been outbid on "${product.title}"!`,
            productId: product._id
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('send_message', async (data) => {
    const { productId, senderId, text, username, isPrivate, recipientId, recipientUsername } = data;
    try {
      const message = await Message.create({
        product: productId,
        sender: senderId,
        recipient: recipientId || null,
        text,
        isPrivate: !!isPrivate
      });
      io.to(productId).emit('receive_message', {
        _id: message._id,
        text,
        sender: { _id: senderId, username },
        recipient: recipientId ? { _id: recipientId, username: recipientUsername } : null,
        isPrivate: message.isPrivate,
        createdAt: message.createdAt
      });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('send_trade_offer', async (data) => {
    const { productId, senderId, description, cashAmount, username, recipientId, recipientUsername } = data;
    try {
      const message = await Message.create({
        product: productId,
        sender: senderId,
        recipient: recipientId,
        text: 'Sent a trade offer!',
        isPrivate: true,
        offer: {
          description,
          cashAmount: Number(cashAmount) || 0,
          status: 'pending'
        }
      });
      io.to(productId).emit('receive_message', {
        _id: message._id,
        text: message.text,
        sender: { _id: senderId, username },
        recipient: { _id: recipientId, username: recipientUsername },
        isPrivate: true,
        offer: message.offer,
        createdAt: message.createdAt
      });
    } catch (err) { console.error(err); }
  });

  socket.on('respond_trade_offer', async (data) => {
    const { messageId, responseStatus, productId } = data; // responseStatus: 'accepted' | 'rejected'
    try {
      const message = await Message.findById(messageId).populate('sender');
      if (!message || !message.offer) return;
      message.offer.status = responseStatus;
      await message.save();

      if (responseStatus === 'accepted') {
        const product = await Product.findById(productId);
        if (product && product.status === 'active') {
          product.status = 'sold';
          product.finalBuyer = message.sender._id; // Sender of the offer is the buyer (populated)
          await product.save();
          io.to(productId).emit('trade_accepted', { productId, finalBuyer: message.sender });
          io.emit('global_ticker', { text: `🤝 @${message.sender.username} just completed a successful barter trade!` });
        }
      }

      io.to(productId).emit('offer_updated', { messageId, status: responseStatus });
    } catch (err) { console.error(err); }
  });


  socket.on('disconnect', () => {
    if (socket.userId) {
      userSockets.delete(socket.userId);
    }
    console.log('User disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
