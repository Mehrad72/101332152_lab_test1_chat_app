const mongoose = require('mongoose');
const userData = new mongoose.Schema({
username: {
    type: String,
    _id: false,
    unique: true,
    maxLength: 50,
    required: true,
},
firstname: {
    type: String,
    maxLength: 50,
    required: true,
},
lastname: {
    type: String,
    maxLength: 50,
    required: true,
},
password: {
    type: String,
    maxLength: 50,
    required: true
},
creation: {
    type: Date,
    default: Date.now
}
});
const Users = mongoose.model('user', userData)
module.exports = {
Users
}