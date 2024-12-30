const mongoose = require('mongoose');

const currencyExchangeSchema = new mongoose.Schema({
  transactionType: {
    type: String, // Array of strings
    required: false,
  },
  currencyFrom: {
    type: String, // Array of strings
    required: false,
  },
  amountFromCurrency: {
    type: Number,
    required: false,
  },
  currencyTo: {
    type: String, // Array of strings
    required: false,
  },
  exchangeRate: {
    type: String, // Array of strings
    required: false,
  },
  customExchangeRate: {
    type: Number,
    required: false,
  },
  city: {
    type: String, // Array of strings
    required: false,
  },
  exchangeMethod: {
    type: String, // Array of strings
    required: false,
  },
  additionalComments: {
    type: String,
    required: false,
  },
});

// Export the model
const CurrencyExchange = mongoose.model('CurrencyExchange', currencyExchangeSchema);

module.exports = CurrencyExchange;
