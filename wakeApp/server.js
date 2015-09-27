var express = require('express');
var app = express();
var http = require("http");
setInterval(function() {
    http.get("http://sleepy-shelf-3224.herokuapp.com/#");
    http.get("http://serene-chamber-6238.herokuapp.com");
}, 30000);

app.listen('9999',function(){
	console.log('wake up app running...');
});