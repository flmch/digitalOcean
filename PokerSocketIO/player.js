// this file has been moved to ./custom/player

"use strict";

function Player(seat_id,username,stack){
	this.seatId = undefined;
	this.username = "";
	this.stack = 0; //stack is starting stack for each round
					//bet will add to stack after one round is over 
					//over a player fold
	this.curBet = 0; // bet for current round
	this.totalBet = 0; // total bet for one game
	this.status = 0;  //0 is stand up, 1 is on seat, 2 is ready/playing, 3 is fold, 4 is allin
	this.cards = [];
}

// player on server
module.exports = Player;