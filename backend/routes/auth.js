const express = require('express');
const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const mailer = require('../utils/mailer');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
};

router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) return res.status(400).json({ message: 'Email is required' });
    
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User with this email already exists' });
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please provide a valid email address format.' });
    }

    try {
        const domain = email.split('@')[1];
        const dns = require('dns');
        const { promisify } = require('util');
        const resolveMx = promisify(dns.resolveMx);
        
        const mxRecords = await resolveMx(domain);
        if (!mxRecords || mxRecords.length === 0) throw new Error('No MX records');
    } catch (err) {
        return res.status(400).json({ message: 'This email domain does not exist or cannot receive emails.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    await OTP.deleteMany({ email }); // Clear older OTPs
    await OTP.create({ email, otp: otpCode });
    
    await mailer.sendMail({
        to: email,
        subject: 'Your Registration OTP',
        text: `Welcome to CampusBID! Your verification code is: ${otpCode}. It expires in 10 minutes.`,
        html: `<h3>Welcome to CampusBID!</h3><p>Your verification code is: <b>${otpCode}</b>.</p><p>It expires in 10 minutes.</p>`
    });

    res.json({ message: 'OTP successfully sent to your email.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/register', async (req, res) => {
  const { otp, password, email } = req.body;
  try {
    if (!email || !password || !otp) return res.status(400).json({ message: 'Email, password, and OTP are required' });

    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    // Generate exciting username from Adjective Nouns
    const adjectives = ['Ninja', 'Swift', 'Epic', 'Chill', 'Savage', 'Crypto', 'Alpha', 'Beta', 'Sigma', 'Prime', 'Neon', 'Cyber', 'Urban', 'Wild', 'Cool'];
    const nouns = ['Bidder', 'Trader', 'Sniper', 'Hustler', 'Mogul', 'Knight', 'Wizard', 'Ghost', 'Rider', 'Phantom', 'Shark', 'Hawk', 'Wolf', 'Panther', 'Lion'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const username = `${randomAdjective}${randomNoun}_${Math.floor(Math.random() * 1000)}`;

    const user = await User.create({ 
        username, 
        password, 
        email, 
        isVerified: true
    });
    
    await OTP.deleteOne({ _id: otpRecord._id }); // cleanup

    res.status(201).json({ 
        _id: user._id, 
        username: user.username, 
        token: generateToken(user._id), 
        onboarded: user.onboarded, 
        profilePic: user.profilePic, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        middleName: user.middleName,
        mobileNumber: user.mobileNumber, 
        hostelName: user.hostelName,
        hostelBlock: user.hostelBlock,
        roomNumber: user.roomNumber
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({ 
          _id: user._id, 
          username: user.username, 
          token: generateToken(user._id), 
          onboarded: user.onboarded, 
          profilePic: user.profilePic, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          middleName: user.middleName,
          mobileNumber: user.mobileNumber, 
          hostelName: user.hostelName,
          hostelBlock: user.hostelBlock,
          roomNumber: user.roomNumber
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/profile', protect, upload.single('profilePic'), async (req, res) => {
  const { firstName, middleName, lastName, mobileNumber, hostelName, hostelBlock, roomNumber, deleteProfilePic } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (firstName !== undefined) user.firstName = firstName;
    if (middleName !== undefined) user.middleName = middleName;
    if (lastName !== undefined) user.lastName = lastName;
    if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;
    if (hostelName !== undefined) user.hostelName = hostelName;
    if (hostelBlock !== undefined) user.hostelBlock = hostelBlock;
    if (roomNumber !== undefined) user.roomNumber = roomNumber;
    user.onboarded = true;

    if (deleteProfilePic === 'true') {
      user.profilePic = '';
    }
    
    if (req.file) {
      user.profilePic = `/uploads/${req.file.filename}`;
    }

    await user.save();
    
    res.json({
        _id: user._id, 
        username: user.username, 
        token: generateToken(user._id), 
        onboarded: user.onboarded, 
        profilePic: user.profilePic, 
        firstName: user.firstName, 
        middleName: user.middleName,
        lastName: user.lastName, 
        mobileNumber: user.mobileNumber, 
        hostelName: user.hostelName,
        hostelBlock: user.hostelBlock,
        roomNumber: user.roomNumber
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/profile/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

