require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cron = require('node-cron');
const app = express();
const cors = require('cors');

// const adminRoutes = require('./routes/admin');
const corsOptions = {
  origin: process.env.CLIENT,
  credentials: true,
  origin: '*',
};
app.use(cors(corsOptions));
app.options('*', cors());
app.use(bodyParser.json({ type: 'application/json' }));
const User = require('./models/User');
const Config = require('./models/Config');
const publicRoutes = require('./routes/public');
const customerRoutes = require('./routes/customer');
const farmerRoutes = require('./routes/farmer');
const adminRoutes = require('./routes/admin');
const errorController = require('./controllers/error');
const taskController = require('./controllers/tasks');
const Product = require('./models/Product');
const Order = require('./models/Order');

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

app.use('/public', publicRoutes);
app.use('/customer', customerRoutes);
app.use('/farmer', farmerRoutes);
app.use('/admin', adminRoutes);

// app.use('/test-notification', async (req, res, next) => {
//   const { sendPushNotification } = require('./controllers/notifications');
//   await sendPushNotification(
//     req.user,
//     {
//       title: 'Test Notification',
//       body: 'This is a test notification used to test.',
//     },
//     true
//   );
//   // await Order.updateMany({}, { customer: req.user._id });
//   res.status(200).json({ message: 'Success' });
// });

app.use(errorController.get404);

mongoose.set('strictQuery', true);
mongoose
  .connect(process.env.MONGO)
  .then((result) => {
    console.log('Ready');
    // taskController.runTasks();
    app.listen(process.env.PORT);
  })
  .catch((err) => console.log(err));
