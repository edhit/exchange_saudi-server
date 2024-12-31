const mongoose = require('mongoose');

const currencyExchangeSchema = new mongoose.Schema({
  transactionType: {
    type: String, // Array of strings
    required: true,
  },
  currencyFrom: {
    type: String, // Array of strings
    required: true,
  },
  amountFromCurrency: {
    type: Number,
    required: true,
  },
  currencyTo: {
    type: String,
    required: true,
  },
  exchangeRate: {
    type: Number,
    required: true,
  },
  city: {
    type: String, 
    required: true,
  },
  exchangeMethod: {
    type: [String], 
    required: true,
  },
  additionalComments: {
    type: String,
    required: false,
  },
  username: {
    type: String,
    required: true,
  },
},   {
  timestamps: true,
})

// Export the model
const CurrencyExchange = mongoose.model('CurrencyExchange', currencyExchangeSchema);

module.exports = CurrencyExchange;
