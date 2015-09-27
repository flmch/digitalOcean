
// require modules
require('newrelic');
var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);
var logger = require('morgan');
var ejs = require("ejs");
var fs = require("fs");
var path = require("path");
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var dbConfig = require('./mongoDB.js');
var mongoose = require('mongoose');
var bodyParser = require("body-parser");
var methodOverride = require("method-override");

// set view engine and public file
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extend:false}));
app.use(methodOverride("_method"));
app.use(cookieParser());
app.set("view_engine","ejs");
app.use(express.static(__dirname + '/public'));
app.use(logger());

//connect database for user info
mongoose.connect(dbConfig.url);
var User = require('./models/user');

// include passport module and define middleware
var passport = require('passport');
var expressSession = require('express-session');

app.use(expressSession({secret: 'mySecretKey'}));
app.use(passport.initialize());
app.use(passport.session());

//define flash
var flash = require('connect-flash');
app.use(flash());

// Initialize Passport
var initPassport = require('./passport/init');
initPassport(passport);

// require custom modules
var Player = require("./custom/player/main.js");
var Game = require("./custom/game/main.js");
var Card = require("./custom/card/main.js");
// var test = require('./custom/game/main.js');

// initiate players record object.
// this object contains an array with 10 elements to store
// players data.
// and a method to count how may players are ready to play
var myGame = new Game();
myGame.initiateCard();
myGame.shuffle();
// router

app.get("/",function(req,res){
	var isLoggedIn = req.isAuthenticated();
	var user = req.user;
	res.render("index.html.ejs",{
		isLoggedIn: isLoggedIn,
		message: req.flash("message"),
		user:user
	});
});

app.get("/login",function(req,res){
	res.render("login.html.ejs");
});

app.post("/login",passport.authenticate("login",{
	successRedirect: '/',
	failureRedirect: '/login',
	failureFlash : true 
}));

app.get("/signup",function(req,res){
	res.render("signup.html.ejs",{message: req.flash("message")});
});

app.post("/signup",passport.authenticate("signup",{
	successRedirect: '/',
	failureRedirect: '/signup',
	failureFlash : true 	
}))

app.get("/signout",function(req,res){
	req.logout();
	res.redirect("/");
});

app.get("/poker",function(req,res){
	var isLoggedIn = req.isAuthenticated();
	var user = req.user;
	
	if(!user){
		res.redirect('/login');
	}else{
		res.render("poker.html.ejs");	
	}
});

app.get("/getuserinfo",function(req,res){
	User.find({_id:req.user._id},function(errs,user){
		if( errs ){
			console.log("errors!");
		}else{
			res.send(JSON.stringify(user));
		}
	});	
});

app.put("/user/:id",function(req,res){
	var id = req.params.id;
	var buyin = req.body.stack;
	console.log("received request");
	console.log(id);
	console.log(buyin);
	User.findOne({_id:id},function(err,user){
		console.log(user.stack);
		user.stack = user.stack-buyin;
		console.log('processing');
		console.log(user.stack);
		user.save(function(err){
			if(err) {
				console.log("Save error.");
				res.send('erros');
			}else{
				console.log("save successfual");
				res.send('successful');
			}
		});
	});
});


// socket controller
io.on("connection",function(socket){
	
	// when a player is connected, sent current status for 
	// all players. Then client will update the view accordingly
	socket.emit("initiate_table",myGame.getPlayerInfo());

	// when username and first buyin data is sent back,
	// save data to player object, which is a key in socket
	socket.on("initiate_player",function(playerInfo){
		console.log(playerInfo);
		socket.player = new Player();
		socket.player.username = playerInfo.username;			
		socket.player.stack = playerInfo.stack;
		socket.player.status = 0;
	});

	socket.on("i_seatDown",function(seatId){
		console.log(socket.player.username + " just seat down at stack "+socket.player.stack);
		socket.player.seatId = seatId;
		socket.player.status = 1;
		myGame.sockets[seatId] = socket;
		io.emit("player_seatDown",socket.player);
		console.log("Current players: "+myGame.countPlayer());
	});

	socket.on("i_standUp",function(seatId){
		console.log(socket.player.username+" stand up.");
		console.log(seatId);
		socket.player.seatId = undefined;
		socket.player.status = 0;
		myGame.sockets[seatId] = undefined;
		io.emit("player_standUp",seatId);
	});

	socket.on("i_ready",function(seatId){
		console.log(socket.player.username+" is ready.")
		if( myGame.ifGameOn ){
			socket.player.status = 1.5;
		}else{
			socket.player.status = 2;
		}
		io.emit("player_ready",seatId);

		// when more than two players are on the table,
		// start count down of 15 seconds, 
		// then game starts automatically
		if( myGame.countReady() === 2 && !myGame.ifGameOn ){
			console.log('ready then count down');
			countDownThenStart(15)
		}
	});

	socket.on('i_break',function(seatId){
		socket.player.status = 1;
		socket.player.totalBet += socket.player.curBet;
		socket.player.curBet = 0;		
		io.emit("player_break",seatId);
	});

	socket.on("disconnect",function(){
		// console.log(myGame.sockets);
		if( socket && socket.player.seatId){
			console.log(socket.player.seatId);
		}
		// console.log('this socket: ');
		// console.log(socket);
		// console.log(myGame.sockets);
		// var id = socket.player.seatId;

		// io.emit("player_left",id);
		// if(myGame.ifGameOn){
		// 	myGame.sockets[id] = {
		// 		player: socket.player
		// 	};	
		// 	myGame.sockets[id].player.status = -1;
		// 	controlWinners([id,"LEFT",undefined]);
		// 	console.log("someone left in middle of game");
		// }else{
		// 	myGame.sockets[id] = undefined;
		// }

		if( socket && socket.player.seatId ){
			
			if(myGame.ifGameOn){
				if(myGame.curPlayer === socket.player.seatId ){
					io.emit("update_action",[socket.player.seatId,
							0,
							"FOLD",
							undefined,
							myGame.pot,
							myGame.curHighBet
						]);
				}
				//create pseudo socket for pot calculation
				myGame.sockets[socket.player.seatId] = {
					player: socket.player
				}
				myGame.sockets[socket.player.seatId].player.status = -1;
			}else{
				myGame.sockets[socket.player.seatId] = undefined;
			}
			io.emit("player_standUp",socket.player.seatId);
		}
		
		// console.log(socket);
		socket = undefined;
		console.log('socket now should be undefined: '+socket);
		console.log("disconnected");
	});

	// socket.on('deleteSocket',function(){

	// 	console.log('deleteSocket');
	// 	console.log(myGame.sockets);
	// 	console.log(socket);
	// 	var id = socket.player.seatId;
	// 	console.log('id: '+id);
	// 	delete socket;
	// 	socket.disconnect();
	// });

	// when a player send an action, do following
	socket.on("action_taken",function(response){
		if(response[1] === "FOLD"){
			console.log(response[0]+" fold");
			socket.player.status = 3;
			socket.player.totalBet += socket.player.curBet;
			socket.player.curBet = 0;
		}else{
			myGame.countAction++;
			if(response[1] === "CHECK"){
				console.log(response[0]+" check");
			}else if(response[1] === "CALL"){
				console.log(response[0]+" call");
				var extra = myGame.curHighBet - socket.player.curBet;
				socket.player.curBet = myGame.curHighBet;
				socket.player.stack -= extra;
				myGame.pot += extra;
				console.log("pot: "+myGame.pot);
			}else if(response[1] === "BET"){
				console.log(response[0]+" bet "+response[2]);
				myGame.curHighBet = response[2];
				socket.player.stack -= response[2];
				socket.player.curBet = response[2];
				myGame.pot += response[2];
				console.log("pot: "+myGame.pot);
			}else if(response[1] === "RAISE"){
				console.log(response[0]+" raised to "+response[2]);
				var extra = response[2] - socket.player.curBet;
				myGame.curHighBet = response[2];
				socket.player.curBet = response[2];
				socket.player.stack -= extra;
				myGame.pot += extra;
				console.log("pot: "+myGame.pot);
			}else if(response[1] === "ALLIN"){
				console.log(response[0]+" allin "+response[2]);
				socket.player.status = 4;
				myGame.curHighBet = Math.max(myGame.curHighBet,response[2]);
				var extra = response[2] - socket.player.curBet;
				socket.player.totalBet += response[2];
				socket.player.curBet = 0;
				socket.player.stack = 0;
				myGame.pot += extra;
				console.log('extra: '+extra);
				console.log("pot: "+myGame.pot);
				console.log(socket.player);
			}
		}

		io.emit("update_action",[response[0],
				socket.player.stack,
				response[1],
				response[1] === "ALLIN"?response[2]:socket.player.curBet,
				myGame.pot,
				myGame.curHighBet
			]);

		controlWinners(response);
	});

	function controlWinners(response){

		// if( myGame.ifAllPlayersAllinOrFold() ){
		// 	myGame.stage++;
		// 	while(myGame.stage<4){
		// 		myGame.dealBoardCard();
		// 		myGame.stage++;
		// 	}	
		// 	myGame.stage--;		
		// };

		// if(myGame.ifAllPlayersAllinOrFold()){
		// 	// update stage and deall all card on board if necessary
		// 	myGame.stage++;
		// 	while(myGame.stage<4){
		// 		myGame.dealBoardCard();
		// 		myGame.stage++;
		// 	}	
		// 	myGame.stage--;		

		// 	io.emit("send_boardcards",myGame.cardsOnBoard);

		// 	// move all curBet to totalBet
		// 	myGame.sockets.forEach(function(socket){
		// 		if(socket && socket.player.curBet >0){
		// 			socket.player.totalBet += socket.player.curBet;
		// 			socket.player.curBet = 0;
		// 		}
		// 	});
		// };

		var winners = myGame.checkWinners();
		if(winners){
			console.log("someone wins!");

			myGame.sockets.forEach(function(socket){
				if(socket){
					socket.player.totalBet += socket.player.curBet;
					socket.player.curBet = 0;
				}
			});

			//split money 
			myGame.splitPot(winners);

			// find out who's stack is lower than one big blind,
			// force the player to rebuy.
			// if player status is greater than 2, reset to 2 ,
			// if player status is 1.5, also reset to 2.
			// if player status is -1, means this player has quit game,
			// then delete the player's info
			myGame.ifGameOn = false;
			myGame.sockets.forEach(function(socket,index){
				if( socket ){
					if( socket.player.status === -1 ){
						myGame.sockets[index] = undefined;
					}
					if( socket.player.stack < 2 ){
						socket.player.status = 1;
						io.emit("player_break",index);						
					}else if(socket.player.status > 1){
						socket.player.status = 2;
					}
				}
			});

			io.emit("win",[winners,myGame.sockets.map(function(socket){
				if(socket){
					return [socket.player.seatId,socket.player.stack,socket.player.username];
				}else{
					return undefined;
				}
			})]);			

			if( myGame.countReady() >= 2 ){
				setTimeout(function(){
					countDownThenStart(10);
				},5000);
				// setTimeout(countDownThenStart(10),5000);
			}
		}else if( myGame.ifNextRound() ){
			console.log("next round");
			console.log("check all fold or allin " + myGame.ifAllPlayersAllinOrFold());
			myGame.sockets.forEach(function(socket){
				if(socket){
					socket.player.totalBet += socket.player.curBet;
					socket.player.curBet = 0;
				}
			});
			console.log('chekcpointeeee');
			myGame.stage++;
			myGame.curHighBet = 0;
			myGame.countAction = 0;
			myGame.dealBoardCard();
			
			// io.emit("action_required",[response[0],
			// 	socket.player.stack,
			// 	response[1],
			// 	socket.player.curBet,
			// 	myGame.pot,
			// 	myGame.curHighBet,
			// 	myGame.cardsOnBoard,
			// 	myGame.firstMove()]);
			
			io.emit("send_boardcards",myGame.cardsOnBoard);

			if(myGame.ifAllPlayersAllinOrFold()){
				setTimeout(function(){
					controlWinners(response);
				},1000);
			}else{
				console.log("first: "+myGame.firstMove());
				io.emit("action_required",myGame.firstMove());
				myGame.curPlayer = myGame.firstMove();				
			}

		}else{
			// io.emit("action_required",[response[0],
			// 	socket.player.stack,
			// 	response[1],
			// 	socket.player.curBet,
			// 	myGame.pot,
			// 	myGame.curHighBet,
			// 	undefined,
			// 	myGame.getNextPlayer(response[0])]);	

			io.emit("action_required",myGame.getNextPlayer(response[0]));
			myGame.curPlayer = myGame.getNextPlayer(response[0]);
		}
	}

	socket.on('rebuy',function(amount){
		socket.player.stack += amount;
		io.emit('rebuy',[socket.player.seatId, socket.player.stack]);
	});

	socket.on("chat message",function(data){
		io.emit("chat message",data);
	});

	// when this function run,
	// myGame setttings will be reset,
	// no one can join the game anymore
	function startNewGame(){
		// skt.on("start_game",function(data){
			myGame.newGame();
			io.emit("dealer_Btn",myGame.dealerPosition);
			myGame.sockets.forEach(function(socket){
				if(socket && (socket.player.status >= 2) ){
					socket.emit("send_cards",socket.player.cards);
				}
			});
			var sb = myGame.getNextPlayer(myGame.dealerPosition);
			var bb = myGame.getNextPlayer(sb);
			var sbBet = myGame.countReady() === 2?2:1;
			var bbBet = myGame.countReady() === 2?1:2;
			myGame.initialBet(sb,bb,sbBet,bbBet);

			io.emit("update_action",["*"+sb,myGame.sockets[sb].player.stack,"BET",sbBet,1,1]);
			io.emit("update_action",["*"+bb,myGame.sockets[bb].player.stack,"BET",bbBet,3,2]);

			io.emit("action_required",myGame.firstMove());
			// io.emit("action_required",["*"+sb,myGame.sockets[sb].player.stack,"BET",sbBet,1,1,undefined,undefined]);
			// io.emit("action_required",["*"+bb,myGame.sockets[bb].player.stack,"BET",bbBet,3,2,undefined,myGame.firstMove()]);
			myGame.curPlayer = myGame.firstMove();
		// });
	}

	function countDownThenStart(initT){
		console.log('trigger count down');
		var countDownT = +initT; 
		io.emit('show_time_left',countDownT);
		var countDown = setInterval(function(){
			countDownT--;
			if( myGame.countReady() < 2 || !countDownT){
				io.emit('stop_count_down',"");
				clearInterval(countDown);
				if( !countDownT ){
					myGame.ifGameOn = true;
					setTimeout(startNewGame(),2000);
				};
			}else{
				io.emit('show_time_left',countDownT);
			}
		},1000);		
	}
});	

http.listen(3000,function(){
	console.log("server running...");
});