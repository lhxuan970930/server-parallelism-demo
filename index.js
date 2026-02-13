const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Simple in-memory "database" for demo purposes only
let users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
];
let nextId = 3;

// Health / root endpoint
app.get('/', (req, res) => {
  res.send('Hello from your Node.js API!');
});

// Get all users
app.get('/users', (req, res) => {
  res.json(users);
});

// Get a single user by id
app.get('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = users.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

// Create a new user
app.post('/users', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  const newUser = { id: nextId++, name, email };
  users.push(newUser);
  res.status(201).json(newUser);
});

// Update an existing user (full update)
app.put('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updatedUser = { id, name, email };
  users[userIndex] = updatedUser;
  res.json(updatedUser);
});

// Partially update an existing user
app.patch('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, email } = req.body;

  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;

  res.json(user);
});

// Delete a user
app.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const userIndex = users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const deletedUser = users[userIndex];
  users = users.slice(0, userIndex).concat(users.slice(userIndex + 1));

  res.json(deletedUser);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
