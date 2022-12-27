require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const cors = require('cors');

// const adminRoutes = require('./routes/admin');
// const shopRoutes = require('./routes/shop');
const corsOptions = {
  origin: process.env.CLIENT,
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors());
app.use(bodyParser.json({ type: 'application/json' }));

const publicRoutes = require('./routes/public');
const errorController = require('./controllers/error');

//put your routes here
app.use('/public', publicRoutes);

app.use(errorController.get404);

mongoose.set('strictQuery', true);
mongoose
  .connect(
    'mongodb+srv://haritha:guzmot@practise.p4xqvt5.mongodb.net/practisedb?retryWrites=true&w=majority'
  )
  .then((result) => {
    console.log('Ready');
    app.listen(process.env.PORT);
  })
  .catch((err) => console.log(err));
