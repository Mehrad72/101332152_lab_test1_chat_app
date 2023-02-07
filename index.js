const express = require('express');
const database = require('./schemas/user-data.js');
const passport = require('passport');
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy;
const userData = database.Users;
const app = express();
const http = require('http');
const mongoose = require('mongoose');
const html = require('path')
const socketio = require('socket.io');
const server = http.createServer(app);
const io = socketio(server);
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(bodyParser.json())
app.use(express.static(html.join(__dirname, 'public')));
const DB_URL = 'mongodb+srv://mehrad72:yZCk4KpLViZgXQP5@data-base.6fusqhj.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const users = [];

io.on('connection', (socket) => {
  console.log('New websocket connection');

  socket.on('joinRoom', ({ username, room }) => {
    const user = { id: socket.id, username, room };
    users.push(user);
    socket.join(room);

    socket.emit('message', {
      username: 'admin',
      text: `${username}, welcome to the room ${room}`,
    });

    socket.broadcast.to(room).emit('message', {
      username: 'admin',
      text: `${username} has joined the room`,
    });

    io.to(room).emit('roomUsers', {
      room,
      users: users.filter((user) => user.room === room),
    });
  });

  socket.on('chatMessage', (msg) => {
    const user = users.find((user) => user.id === socket.id);
    io.to(user.room).emit('message', {
      username: user.username,
      text: msg,
      time: new Date().toLocaleTimeString(),
    });
  });

  socket.on('disconnect', () => {
    const user = users.find((user) => user.id === socket.id);
    if (user) {
      users.splice(users.indexOf(user), 1);
      io.to(user.room).emit('message', {
        username: 'admin',
        text: `${user.username} has left the room`,
      });
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: users.filter((user) => user.room === user.room),
      });
    }
  });
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('Connected to MongoDB');
});

app.use(session({
    secret: 'secret key',
    resave: false,
    saveUninitialized: false
  }));

passport.use(new LocalStrategy({
    usernameField: 'username'
  }, (username, password, done) => {
    users.findOne({ username: username }).then((user) => {
      if (!user) {
        return done(null, false, { message: 'Incorrect username' });
      }
  
      if (user.password !== password) {
        return done(null, false, { message: 'Incorrect password' });
      }
  
      return done(null, user);
    }).catch((err) => {
      return done(err);
    });
  }));
  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser((id, done) => {
    users.findById(id).then((user) => {
      done(null, user);
    }).catch((err) => {
      done(err);
    });
  });
app.use(passport.initialize());
app.use(passport.session());

app.post('/signup', (req, res) => {
    const user = new userData(req.body);
    user.save().then((user) => {
        res.send(user);
    }).catch((err) => {
        res.status(500).send({
            message: err.message || "couldnt add the user."
        });
    });
});
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
  }
app.post('/login', (req, res) => {
    userData.findOne({
        username: req.body.username
    }).then((user) => {
        if (!user) {
            res.status(400).send({
                message: 'Username not found',
            });
        } else if (user.password !== req.body.password) {
            res.status(400).send({
                message: 'Incorrect password'
            });
        } else {
            res.redirect(`/login.html?username=${req.body.username}`);
        }

    }).catch((err) => {
        res.status(500).send({
            message: err.message
        });
    });
});

app.get('/login', (req, res) => {
    if (!req.isAuthenticated()) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname + '/login.html'));
    }
});

app.post('/login.html/logout', (req, res) => {
    res.redirect('/');
});


app.get('/chat.html', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/chat.html');
});

server.listen(3000, () => {
    console.log('running on port 3000');
});