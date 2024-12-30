const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true },
  username: { type: String, required: true },
},   {
    timestamps: true,
  });

module.exports = mongoose.model('User', userSchema);