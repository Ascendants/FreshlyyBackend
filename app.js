require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const cors = require('cors');

// const adminRoutes = require('./routes/admin');
const corsOptions = {
  origin: process.env.CLIENT,
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors());
app.use(bodyParser.json({ type: 'application/json' }));
const User = require('./models/User');
const Config = require('./models/Config');

const publicRoutes = require('./routes/public');
const customerRoutes = require('./routes/customer');
const errorController = require('./controllers/error');

//put your routes here
app.use('/', async (req, res, next) => {
  try {
    let config = await Config.findOne({});
    if (!config) {
      config = new Config();
      await config.save();
    }
    req.config = config;
    const user = req.headers.useremail;
    req.user = await User.findOne({ email: user });
    next();
  } catch (err) {
    console.log(err);
  }
});

app.use('/test', async (req, res, next) => {
  console.log(req.query);
});

app.use('/public', publicRoutes);
app.use('/customer', customerRoutes);

app.use(errorController.get404);

mongoose.set('strictQuery', true);
mongoose
  .connect(process.env.MONGO)
  .then((result) => {
    console.log('Ready');
    app.listen(process.env.PORT);
  })
  .catch((err) => console.log(err));
