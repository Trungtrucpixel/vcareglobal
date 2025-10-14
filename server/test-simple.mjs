import express from 'express';

const app = express();
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Home endpoint
app.get('/api/home', (req, res) => {
  res.json({
    activeCards: 7,
    totalBranches: 2,
    totalRevenue: 50000000,
    transparencyRate: 49,
    cardTypes: [
      { type: "Standard", price: 2000000, sessions: 12 },
      { type: "Silver", price: 8000000, sessions: 15 },
      { type: "Gold", price: 18000000, sessions: 18 },
      { type: "Platinum", price: 38000000, sessions: 20 },
      { type: "Diamond", price: 100000000, sessions: 24 }
    ]
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }
  
  // Mock authentication - in real app, check against database
  if (email === 'admin@phucanduong.com' && password === 'admin123') {
    res.json({
      success: true,
      message: 'Login successful',
      user: { 
        id: '1', 
        name: 'Admin User',
        email, 
        role: 'admin',
        phone: '0123456789'
      }
    });
  } else if (email === 'user@phucanduong.com' && password === 'user123') {
    res.json({
      success: true,
      message: 'Login successful',
      user: { 
        id: '2', 
        name: 'Test User',
        email, 
        role: 'customer',
        phone: '0987654321'
      }
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
});

// Register user endpoint
app.post('/api/register-user', (req, res) => {
  const { name, email, phone, password } = req.body;
  
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  // Mock registration - in real app, save to database
  res.json({
    success: true,
    message: 'User registration successful',
    user: { 
      id: Math.random().toString(36).substr(2, 9),
      name, 
      email, 
      phone,
      role: 'customer'
    }
  });
});

// Quick register endpoint
app.post('/api/quick-register', (req, res) => {
  const { fullName, phoneNumber, emailOptional, idNumber, partnerValue } = req.body;
  
  if (!fullName || !phoneNumber || !partnerValue) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  // Mock registration - in real app, save to database
  res.json({
    success: true,
    message: 'Quick registration successful',
    data: {
      id: Math.random().toString(36).substr(2, 9),
      fullName,
      phoneNumber,
      emailOptional,
      idNumber,
      partnerValue,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  });
});

// Register card endpoint
app.post('/api/register', (req, res) => {
  const { email, phone, cardType } = req.body;
  
  if (!email || !phone || !cardType) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  res.json({
    success: true,
    message: 'Card registration successful',
    data: {
      user: { id: '123', email, phone },
      card: { id: '456', type: cardType.type, price: cardType.price }
    }
  });
});

// Serve static files
app.use(express.static('dist/public'));

app.get('/', (req, res) => {
  res.sendFile('dist/public/index.html', { root: '.' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Ready to accept requests...');
});
