"use strict";

var net = require("net");
var fs = require("fs");
var client = [];
var messagesHistory = [];
var loggedInClients = {};

function MSGObj(socket, time, content){
	this.socket = socket;
	this.time = time;
	this.content = content;
}

MSGObj.prototype.printToClient = function(){
	return "user: "+ getUserName(this.socket) +" at "+this.time+" says: "+this.content;
}

function getUserName(socket){
	if(socket.username === undefined){
		return client.indexOf(socket);
	}else{
		return socket.username;
	} 	
}

function getCurrentTime(){
	var time = new Date();
	return time.getHours()+":"+time.getMinutes()+":"+time.getSeconds();
}

function broadcastMessage(msg){
	client.forEach(function(ele){
		ele.write(msg);
	});
}

function removeUser(socket){
	client.splice(client.indexOf(socket),1);
	if(socket.username !== undefined){
		delete loggedInClients[socket.username];
	}
}

function showHelp(socket){
	socket.write("username input and login: /username YOUR USERNAME\n");
	socket.write("show all log in users: /list\n");
	socket.write("kick user(only log in users): /kick USERNAME\n");
	socket.write("send private message: /private USERNAME PRIVATE MESSAGE\n");
}

net.createServer(function(socket){

	//push the new socket to socket array
	client.push(socket);
	socket.write("Type command /help for help\n");
	socket.write("Message history: \n");

	//print message history to the new user
	messagesHistory.forEach(function(msg){
		socket.write(msg+"\n");
	});

	//tell all users that new user just joined
	broadcastMessage("User: "+client.indexOf(socket)+" has just joined chat room. "+ client.length +" users online now."+"\n");

	socket.on("data",function(data){
		var input = data.toString().trim().split(" ");
		if(input[0].toLowerCase() === "/username"){
			if(input.length<2){
				socket.write("Username can't be empty.");
			}else{
				var previousName = getUserName(socket);
				
				//if previous name exists, which mean the user is logged in
				//delete it from loggedInClient first
				if(socket.username !== undefined){
					delete loggedInClients[socket.username];
				}

				//apply new name then add the user to loggedInClient
				socket.username = input.slice(1).join(" ");
				loggedInClients[socket.username] = client.indexOf(socket);

				//broadcast
				broadcastMessage("User: "+previousName+" has changed name to "+socket.username+"\n");
			}
		}else if(input[0].toLowerCase() === "/kick"){
			if(socket.username === undefined){
				socket.write("You can't kick people if you're not logged in.\n");
				socket.write("Log in by adding a username, use command /username.\n");
			}else{
				if(input.length<2){
					socket.write("Input user's name to kick.");
				}else{
					if(loggedInClients.hasOwnProperty(input[1])){
						var socketToDestroy = client[loggedInClients[input[1]]];
						removeUser(socketToDestroy);
						socketToDestroy.destroy();
						//broadcast
						broadcastMessage("User: "+input[1]+" has been kicked out from chat\n")
					}else{
						socket.write("User doesn't exists");
					}
				}
			}
		}else if(input[0].toLowerCase() === "/list"){
			var userList = "";
			for(var key in loggedInClients){
				userList += key+"\n";
			}
			socket.write("Users that have logged in: \n"+userList);
		}else if(input[0].toLowerCase() === "/private"){
			if(input.length<2){
				socket.write("Missing target user.\n");
			}else{
				var target = input[1];
				if(loggedInClients.hasOwnProperty(target)){
					client[+loggedInClients[target]].write("Private message from "
															+getUserName(socket)
															+" at "+getCurrentTime()
															+": "+input.slice(2).join(" ")+"\n");
					socket.write("Private message sent");
				}else{
					socket.write("User not exists or not logged in.\n");
				}
			}
		}else if(input[0].toLowerCase() === "/help"){
			showHelp(socket);
		}else{
			var currentMessage = new MSGObj(socket, getCurrentTime(), data.toString().trim());
			messagesHistory.push(currentMessage.printToClient());
			broadcastMessage(currentMessage.printToClient()+"\n")
			fs.writeFileSync("data.json",JSON.stringify(messagesHistory));			
		}
	});

	socket.on("end",function(){
		client.splice(client.indexOf(socket),1);
		broadcastMessage("User "+getUserName(socket)+" just left chat room. "+client.length+" users online now."+"\n");
	});
}).listen(8888,function(){
	console.log("server is running...")
});