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
const moment = require('moment');
const loremIpsum = require('lorem-ipsum');

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
        db: 'snippetsdb', // optional
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
  //console.log(req.body.tags)

  Snippet.create(
    {title: req.body.title,
    user: res.locals.user.username,
    language: req.body.language,
    body: "<code>"+loremIpsum({
    count: 2,                      // Number of words, sentences, or paragraphs to generate.
    units: 'sentences',           // Generate words, sentences, or paragraphs.
    sentenceLowerBound: 5,        // Minimum words per sentence.
    sentenceUpperBound: 15,       // Maximum words per sentence.
    format: 'plain',              // Plain text or html
    random: Math.random,         // A PRNG function. Uses Math.random by default
    })+"</code>",
    date_created: moment(),
    notes: req.body.notes,
    tags: req.body.tags.split(',')
    }
  )

  .then(function (snippet) {

    // snippet.user = res.locals.user.username;
    // snippet.save((err, todo) => {
    //         if (err) {
    //             res.status(500).send(err)
    //         }
    //         res.status(200).send(snippet);
    //     });
    // console.log("snippet: "+snippet)
    // console.log("snippet.user: "+snippet.user);

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

app.get('/:user/', function (req, res) {
  Snippet.find({user: req.params.user}).then(function (snippet) {
    res.render("user", {snippet: snippet, user: req.params.user});
  })
})

app.get('/language/:language/', function (req, res) {
  Snippet.find({language: req.params.language}).then(function (snippet) {
    res.render("language", {snippet: snippet, language: req.params.language});
  })
})

app.get('/tag/:tag/', function (req, res) {
  Snippet.find({tags: req.params.tag}).then(function (snippet) {
    res.render("tag", {snippet: snippet, tag: req.params.tag});
  })
})

app.get('/', function(req, res) {
  Snippet.find().then(function (snippet) {
  res.render('index', {snippet: snippet});
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
