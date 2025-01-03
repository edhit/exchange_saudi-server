const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true },
  username: { type: String, required: true },
},   {
    timestamps: true,
  });

const User = mongoose.model('User', userSchema);

module.exports = User;