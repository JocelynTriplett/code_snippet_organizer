const mongoose = require('mongoose');

const snippetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  language: {
    type: String,
    enum: ['Javascript', 'Java', 'Ruby', 'HTML', 'JSON', 'CSS', 'text'],
    required: true
  },
  user: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  date_created: {
    type: String,
    required: true
  }
  date_modified: {
    type: String,
    required: true
  }
  notes: {
    type: [String]
  },
  tags: {
    type: [String]
  }
});

const Snippet = mongoose.model('Snippet', snippetSchema);

module.exports = Snippet;
