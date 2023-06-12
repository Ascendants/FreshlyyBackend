const cron = require('node-cron');
const taskController = require('./controllers/tasks');
exports.hourly = () => {
  cron.schedule('0 0 * * * *', () => {
    taskController.runHourlyTasks();
  });
};

exports.daily = () => {
  cron.schedule('0 15 0 * * *', () => {
    taskController.runDailyTasks();
  });
};

exports.monthly1st = () => {
  cron.schedule('0 30 0 0 * *', () => {
    taskController.runMonthly1stTasks();
  });
};

exports.monthly5th = () => {
  cron.schedule('0 30 0 5 * *', () => {
    taskController.runMonthly5thTasks();
  });
};
