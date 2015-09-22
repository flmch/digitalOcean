var mongoose = require('mongoose');
 
module.exports = mongoose.model('Contest',{
    title: String,
    owner: String,    
    date: String,
    type: String
});