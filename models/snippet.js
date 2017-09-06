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
    type: String
  },
  body: {
    type: String,
    required: true
  },
  date_created: {
    type: String
  },
  date_modified: {
    type: String
  },
  notes: {
    type: [String]
  },
  tags: {
    type: [String]
  }
});

const Snippet = mongoose.model('Snippet', snippetSchema);

module.exports = {
    Snippet: Snippet
};
