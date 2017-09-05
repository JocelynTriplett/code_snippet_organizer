//Requirements:

// have a comprehensive set of tests for all controllers and models
// have registration and login
// allow you to create a snippet
// allow you to see a list of all your snippets
// allow you to see a list of all your snippets for a specific language
// allow you to see a list of all your snippets for a specific tag
// allow you to look at an individual snippet
// have an API to allow for creating and viewing of snippets as listed above

const fs = require('fs');
const path = require('path');
const express = require('express');
const mustacheExpress = require('mustache-express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bodyParser = require('body-parser');
const user_model = require("./models/user");
const snippet_model = require("./models/snippet");
const flash = require('express-flash-messages');
const mongoose = require('mongoose');
const expressValidator = require('express-validator');
const User = user_model.User;
const Snippet = snippet_model.Snippet;

const app = express();

mongoose.connect('mongodb://127.0.0.1:27017/snippetdb',{useMongoClient: true});
mongoose.Promise = require('bluebird');

app.engine('mustache', mustacheExpress());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'mustache')
app.set('layout', 'layout');
app.use('/static', express.static('static'));
//app.use(bodyParser.urlencoded({ extended: true }));


passport.use(new LocalStrategy(
    function(username, password, done) {
        User.authenticate(username, password, function(err, user) {
            if (err) {
                return done(err)
            }
            if (user) {
                return done(null, user)
            } else {
                return done(null, false, {
                    message: "There is no user with that username and password."
                })
            }
        })
    }));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(expressValidator());


app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: new(require('express-sessions'))({
        storage: 'mongodb',
        instance: mongoose, // optional
        host: 'localhost', // optional
        port: 27017, // optional
        db: 'test', // optional
        collection: 'sessions', // optional
        expire: 86400 // optional
    })
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function (req, res, next) {
  res.locals.user = req.user;
  next();
})

app.get('/new/', function (req, res) {
  res.render('new_snippet');
});

app.post('/new/', function (req, res) {
  // console.log("Snippet: "+Snippet);
  // console.log("req.body: "+req.body);
  Snippet.create(req.body)
  .then(function (snippet) {
    res.redirect('/');
})

  .catch(function (error) {
    let errorMsg;
    // if (error.code === DUPLICATE_RECORD_ERROR) {
    //   // make message about duplicate
    //   errorMsg = `The book name "${req.body.title}" has already been used.`
    // } else {
      errorMsg = "You have encountered an unknown error."
    // }
    res.render('index', {errorMsg: errorMsg});
  })
});

app.get('/', function(req, res) {
  Snippet.find().then(function (snippet) {
  res.render('index', {snippet: snippet});
})
});

app.get('/login/', function(req, res) {
    res.render("login", {
        messages: res.locals.getMessages()
    });
});

app.post('/login/', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login/',
    failureFlash: true
}))

app.get('/register/', function(req, res) {
    res.render('register');
});

app.post('/register/', function(req, res) {
    req.checkBody('username', 'Username must be alphanumeric').isAlphanumeric();
    req.checkBody('username', 'Username is required').notEmpty();
    req.checkBody('password', 'Password is required').notEmpty();

    req.getValidationResult()
        .then(function(result) {
            if (!result.isEmpty()) {
                return res.render("register", {
                    username: req.body.username,
                    errors: result.mapped()
                });
            }
            const user = new User({
                username: req.body.username,
                password: req.body.password
            })

            const error = user.validateSync();
            if (error) {
                return res.render("register", {
                    errors: normalizeMongooseErrors(error.errors)
                })
            }

            user.save(function(err) {
                if (err) {
                    return res.render("register", {
                        messages: {
                            error: ["That username is already taken."]
                        }
                    })
                }
                return res.redirect('/');
            })
        })
});

function normalizeMongooseErrors(errors) {
    Object.keys(errors).forEach(function(key) {
        errors[key].message = errors[key].msg;
        errors[key].param = errors[key].path;
    });
}

app.get('/logout/', function(req, res) {
    req.logout();
    res.redirect('/');
});

const requireLogin = function (req, res, next) {
  if (req.user) {
    next()
  } else {
    res.redirect('/login/');
  }
}

app.get('/secret/', requireLogin, function (req, res) {
  res.render("secret");
})

app.listen(3000, function() {
    console.log('Express running on http://localhost:3000/.')
});

module.exports = app;
