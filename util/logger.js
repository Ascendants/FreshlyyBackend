exports.logger = function (content) {
  if (process.env.ENV == 'dev') console.log(content);
};
