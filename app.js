require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();

// const adminRoutes = require('./routes/admin');
// const shopRoutes = require('./routes/shop');
const corsOptions = {
  origin: process.env.CLIENT,
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors());
app.use(bodyParser.json({ type: 'application/json' }));

const errorController = require('./controllers/error');

//put your routes here

app.use(errorController.get404);

app.listen(process.env.PORT);
