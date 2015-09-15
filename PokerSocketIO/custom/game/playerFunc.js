/////////////////////////////////////////////////////////////////
// Functions for player
////////////////////////////////////////////////////////////////

'use strict';

var addPrototype = function(Game){

	// get each player's infor from socket then return the array
	Game.prototype.getPlayerInfo = function (){
		return this.sockets.map(function(socket){
			return socket?socket.player:socket;
		});
	}

	// count number of player
	Game.prototype.countPlayer = function(){
		return this.sockets.filter(function(socket){
			return socket;
		}).length;
	}

	// count number of ready players (folded player not count)
	Game.prototype.countReady = function(){
		return this.sockets.filter(function(socket){
			return socket && (socket.player.status === 2 || socket.player.status === 4);
		}).length;
	}

	// return id of next player
	Game.prototype.getNextPlayer = function(position){
		var self = this;
		position = (position+1)%10;
		// console.log(self.sockets.map(function(ele){return ele?ele.player.status:ele}));
		while( !self.sockets[position] || 
				self.sockets[position].player.status < 2){
			position = (position+1)%10;
		}
		return position;
	}

	// move dealer to next position
	Game.prototype.shiftToNextDealer = function (){
		this.dealerPosition = this.getNextPlayer(this.dealerPosition);
	}

	// return the position that will firstly take action
	Game.prototype.firstMove = function(){
		if(this.stage === 0){
			var utg = this.dealerPosition;
			for(var i=0;i<3;i++){
				utg = this.getNextPlayer(utg);
			}
			return this.countReady()===2?this.dealerPosition:utg;
		}else{
			return this.getNextPlayer(this.dealerPosition);
		}
	}

	// run bet action. input for id and bet amount required
	Game.prototype.bet = function(id,amount){
		this.sockets[id].player.stack -= amount;
		this.sockets[id].player.bet = 0;
		this.pot += amount;
	}

	Game.prototype.initialBet = function(sb,bb,sbBet,bbBet){
		// var sb = this.getNextPlayer(this.dealerPosition);
		// var bb = this.getNextPlayer(sb);
		this.pot = 3;
		this.sockets[sb].player.stack -= sbBet;
		this.sockets[bb].player.stack -= bbBet;
		this.sockets[sb].player.curBet = sbBet;
		this.sockets[bb].player.curBet = bbBet;
		if(this.sockets[bb].player.stack === 0){
			this.sockets[bb].player.status = 4;
		}
		this.curHighBet = 2;
	}

	Game.prototype.newGame = function(){

		this.sockets.forEach(function(socket){
			if(socket){
				socket.player.cards = [];
				socket.player.totalBet = 0;
				socket.player.curBet = 0;	
			}
		});
		
		this.initiateCard();
		
		this.shuffle();
		this.shuffle();
		
		this.dealerPosition = this.getNextPlayer(this.dealerPosition);
		
		this.cardsOnBoard = [];
		this.pot = 0;
		this.curHighBet = 0;
		this.countAction = 0;
		this.stage = 0;
		this.dealCard();
	}

	Game.prototype.ifNextRound = function(){
		var self = this;
		if( self.countAction < self.countReady() ){
			return false;
		}else{
			var checker = true;
			self.sockets.forEach(function(socket){
				if(socket){
					if(socket.player.status === 2 && socket.player.curBet < self.curHighBet ){
						checker = false;
					}				
				}
			});
			return checker;
		}
	}

	Game.prototype.ifAllPlayersAllinOrFold = function(){
		var checker = true;
		this.sockets.forEach(function(socket){
			if( socket && socket.player.status === 2 ){
				checker = false;
			}
		});
		return checker;
	}

	Game.prototype.checkWinners = function(){
		// if someone win, return winner list as array
		// else return undefined
		var self = this;
		if(self.countReady() === 1){
			var position;
			self.sockets.forEach(function(socket,index){
				if( socket && (socket.player.status === 2 || socket.player.status === 4 ) ){
					position = index;
				}
			});
			return position;
		}else if( 
			 self.stage === 3 && 
				( self.ifNextRound() || self.ifAllPlayersAllinOrFold() ) 
			){
			// compare card strength and get who wins
			return self.getWinners();
		}else{
			return undefined;
		}
	}

	// Game.prototype.findStackLeaderExceptSelf = function(id){
	// 	var max = 0;
	// 	sefl.sockets.forEach(function(socket,index){
	// 		if(socket && (index !== id) )
	// 			var overallStack = socket.player.stack+socket.player.curBet+socket.player.totalBet;
	// 			max = Math.max(max,overallStack);
	// 		}
	// 	});
	// 	return max;
	// }
};

module.exports = addPrototype;

