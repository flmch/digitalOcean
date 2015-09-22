///////////////////////////////////////////////////////////////////////////
// method to split pot
///////////////////////////////////////////////////////////////////////////

'use strict';

var addPrototype = function(Game){

	// splitting methodology:
	// seperate winners and losers, winners will split losers money, then take back own money.
	// to split losers money, firstly loop through each loser, then compare his bet with 
	// each winner (lowest bet to higheset bet). If loser's bet is smaller than or equal to
	// winner's bet for current compare, which means all the money from current loser will be 
	// splitted without anything left. Otherwise if loser's bet is greater than current winner's bet,
	// splitted only that part of loser's bet, then go to next winner with higher bet.
	Game.prototype.splitPot = function(winners){
		console.log("winners: "+winners);
		var self = this;

		// if one player wins without stand to the end of the game, he takes po
		// otherwise all cards on board are shown, winners is in array format
		if( typeof winners === "object"){
			
			var winnersCount = winners.length;

			var winnersId = winners.map(function(winner){
				return winner[0];
			});

			//get losersBet from lowest to highest
			var losersBet = self.sockets.filter(function(socket){
				if(socket){
					return winnersId.indexOf(socket.player.seatId) === -1 && socket.player.totalBet > 0;
				}else{
					return false;
				}
			}).map(function(socket){
				return socket.player.totalBet;
			});

			//split losers money
			losersBet.forEach(function(loserBet){
				//loop through winner from lowest bet to highest ,
				//for each loserBet, find how many winners bet greater than it,
				// and how many winners lower.

				// checker is used to check if all the winners left have
				// greater bet than loserBet, if yes, move to next loserBet
				var checker = true;
				var i=0;

				while( i < winnersCount && checker){
					var curProfit = 0;
					if(loserBet<=self.sockets[winnersId[i]].player.totalBet){
						curProfit = loserBet - (!i?0:self.sockets[winnersId[i-1]].player.totalBet);
						checker = false;
					}else{
						curProfit = self.sockets[winnersId[i]].player.totalBet - 
							(!i?0:self.sockets[winnersId[i-1]].player.totalBet);
					}

					// winner with index larger or equal to i will share the curProfit
					for(var j=i; j<winnersCount; j++){
						if( j === winnersCount-1 ){
							self.sockets[winnersId[j]].player.stack += curProfit;
							curProfit = 0;					
						}else{
							var curSlice = Math.floor(curProfit/(winnersCount-j));
							self.sockets[winnersId[j]].player.stack += curSlice;
							curProfit -= curSlice;
						}		
					}

					i++;
				}; //end of while loop
			});

			// winners get own money back
			winnersId.forEach(function(id){
				self.sockets[id].player.stack += self.sockets[id].player.totalBet;
			});		
		// if only one player wins	
		}else{
			console.log("current pot: "+self.pot);
			self.sockets[winners].player.stack += self.pot;
		}

		// clean up after split
		self.sockets.forEach(function(socket){
			if(socket){
				socket.player.curBet = 0;
				socket.player.totalBet = 0;
			}
		});
		self.pot = 0;
	}

}

module.exports = addPrototype;