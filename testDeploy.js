var net = require("net");

net.createServer(function(socket){
	socket.on("data",function(data){
		console.log(data.toString()+"\n");
	});
}).listen(8888,function(){
	console.log("server is running...");
});