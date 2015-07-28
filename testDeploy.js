var net = require("net");
var clientCount = 0;

net.createServer(function(socket){
	clientCount++;
	console.log(clientCount+" user on line.\n")
	socket.on("data",function(data){
		console.log(data.toString()+"\n");
	});
}).listen(8888,function(){
	console.log("server is running...");
});