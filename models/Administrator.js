const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const administratorSchema = new Schema({
  accessLevel: {
    type: String,
    required: true,
    default: 'Base',
  },
});
module.exports = mongoose.model('Administrator', administratorSchema);
