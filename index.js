const mongoose = require('mongoose');
require('./config/db');

const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const router = require('./rutas');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const res = require('express/lib/response');
const createError = require('http-errors');
const passport = require('./config/passport');
require('dotenv').config({ path : 'variables.env'});

const app = express();

//habilitar bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//validacion de campos
app.use(expressValidator());


//habilitar handlebars para las views o templates
app.engine('handlebars',
    exphbs.engine({
        defaultLayout: 'layout',
        //layoutDir:__dirname+'/views/layouts/',
        helpers: require('./helpers/handlebars')
    })
);
app.set('view engine', 'handlebars');

//public static files
app.use(express.static(path.join(__dirname, 'public')) );

app.use(cookieParser());

app.use(session({
    secret: process.env.SECRETO,
    key: process.env.KEY,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl : process.env.DATABASE, })
}));

//inicializar passport
app.use(passport.initialize());
app.use(passport.session());

//alertas y flash messages
app.use(flash());

//crear nuestro middleware
app.use((req, res, next) => {
    res.locals.mensajes= req.flash();
    next();
});

app.use('/', router() );

//error 404 pag no existente
app.use((req, res, next) => {
    next(createError(404,'No Encontrado'));
});

//administracion de errores
app.use((error, req, res, next) => {
    res.locals.mensaje= error.message;

    res.render('error');
});

app.listen(process.env.PUERTO);