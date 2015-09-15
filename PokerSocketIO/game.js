// this file has been moved to ./custom/game

"use strict";

var Card = require("./card.js");

var suits = ["S","H","C","D"]
var numbers = ["A","K","Q","J","T","9","8","7","6","5","4","3","2","A"];

// function Card(suit, number){
// 	this.suit = suit;
// 	this.number = number;
// }

// Game Prototype

function Game (){
	this.sockets = [undefined,undefined,undefined,
					undefined,undefined,undefined,
					undefined,undefined,undefined,
					undefined];				
	this.deck = [];
	this.initiateCard();
	this.shuffle();
	this.dealerPosition = 0;
	// this.curPosition = 0;
	this.bigBlind = 2;
	this.stage = 0;  // 0 preflop, 1 flop, 2 turn, 3 river
	// this.pot = [[0],[undefined,undefined,undefined,
	// 				undefined,undefined,undefined,
	// 				undefined,undefined,undefined,
	// 				undefined]]; // one main pot and ten sidepots
	this.pot = 0;
	this.curHighBet = 0;
	this.cardsOnBoard = [];
	this.countAction;
}

/////////////////////////////////////////////////////////////////
// Functions for cards
/////////////////////////////////////////////////////////////////
Game.prototype.initiateCard = function(){
	var self = this;
	self.deck = [];
	suits.forEach(function(suit){
		for(var i=0;i<13;i++){
			var curCard = new Card(suit,numbers[i]);
			self.deck.push(curCard);
		}
	});	
}

Game.prototype.shuffle = function(){
	var self = this;
	self.deck.forEach(function(card,index){
		var toswap = Math.floor(Math.random()*52);
		var temp = card;
		self.deck[index] = self.deck[toswap];
		self.deck[toswap] = temp;
	});
}

Game.prototype.dealCard = function(){
	var self = this;
	var playerNumber = self.countReady();
	//start from small blind position
	var cur = self.getNextPlayer(self.dealerPosition);
	for(var i=0;i<2*playerNumber;i++){
		self.sockets[cur].player.cards.push(self.deck.shift());
		cur = self.getNextPlayer(cur);
	}
}

/////////////////////////////////////////////////////////////////
// Functions for player
/////////////////////////////////////////////////////////////////

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
			self.sockets[position].player.status !== 2){
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

Game.prototype.initialBet = function(sb,bb){
	// var sb = this.getNextPlayer(this.dealerPosition);
	// var bb = this.getNextPlayer(sb);
	this.pot = 3;
	this.sockets[sb].player.stack -= 1;
	this.sockets[bb].player.stack -= 2;
	this.sockets[sb].player.curBet = 1;
	this.sockets[bb].player.curBet = 2;
	this.curHighBet = 2;
}

Game.prototype.newGame = function(){

	this.sockets.forEach(function(socket){
		if(socket){
			socket.player.status = 2;
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
	this.pot = [[0]];
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

Game.prototype.checkWinners = function(){
	// if someone win, return winner list as array
	// else return undefined
	var self = this;
	if(self.countReady() === 1){
		var position;
		self.sockets.forEach(function(socket,index){
			if(socket){
				if(socket.player.status === 2){
					position = index;
				}
			}
		});
		return position;
	}else if(self.stage === 3 && self.ifNextRound()){
		// compare card strength and get who wins
		return self.getWinners();
	}else{
		return undefined;
	}
}

Game.prototype.dealBoardCard = function(){
	this.deck.shift();
	this.cardsOnBoard.push(this.deck.shift());
	if(this.stage === 1){
		this.cardsOnBoard.push(this.deck.shift());
		this.cardsOnBoard.push(this.deck.shift());
	}
}

///////////////////////////////////////////////////////////////////////////
// calculate card strength
///////////////////////////////////////////////////////////////////////////

Game.prototype.getSevenCards = function(id){
	var sevenCards = this.sockets[id].player.cards.concat(this.cardsOnBoard);
	sevenCards.sort(function(a,b){
		return numbers.indexOf(b.number) - numbers.indexOf(a.number);
	});　

	return sevenCards;
}

// check if there is flush, 
// if yes, return the suit,
// otherwise return false
Game.prototype.ifFlush = function(arr){
	var suit = {
		"H" : 0,
		"S" : 0,
		"D" : 0,
		"C" : 0,
	}
	for(var i=0;i<arr.length;i++){
		// console.log(suit[arr[i].suit]);
		// suit[arr[i].suit].push(numbers.indexOf(arr[i].number));
		suit[arr[i].suit]++;
		if( suit[arr[i].suit] >= 5 ){
			return arr[i].suit;
		}
	}
	return false;
}

// check if there is straight,
// input an array of numbers in order 
// if yes, return the index in 'numbers' for first number of straight,
// otherwise return false
Game.prototype.ifStraight = function(numberArr){
  	for(var i=0;i<numberArr.length-3;i++){
  		if(	numbers.indexOf(numberArr[i]) <=9 &&
  			numberArr.indexOf( numbers[numbers.indexOf(numberArr[i])+1] ) !== -1 &&
  		   	numberArr.indexOf( numbers[numbers.indexOf(numberArr[i])+2] ) !== -1 &&
  		   	numberArr.indexOf( numbers[numbers.indexOf(numberArr[i])+3] ) !== -1 && 
  		   	numberArr.indexOf( numbers[numbers.indexOf(numberArr[i])+4] ) !== -1 ){
  			return numbers.indexOf(numberArr[i]);
  		}
  	}
  	return false;
}

Game.prototype.getHand = function(id){

	//  0. StraightFlush
	//  1. Quaz
	//  2. Full House
	//  3. FLush
	//  4. Straight
	//  5. Three of a kind
	//  6. Two pairs
	//  7. One Pair
	//  8. High card

	var self = this;
	var sevenCards = self.getSevenCards(id);

	// get number array and obj 
	// number array looks like : ["A","K","T","T","T","5","3"]
	var self = this;
	var numberArr = sevenCards.map(function(ele){
		return ele.number;
	});

	// number obj looks like : { 
	//	                  "A" : 1,
	//	                  "K" : 1,
	//	                  "T" : 3,
	//	                  "5" : 1,
	//	                  "3" : 1,
	//  }
	var numberObj = {};
	numberArr.forEach(function(ele){
		if(numberObj.hasOwnProperty(ele)){
			numberObj[ele]++;
		}else{
			numberObj[ele] = 1;
		}
	});

	var ifFour = false;
	var ifThree = false;
	var ifPairOne = false;
	var ifPairTwo = false;

	for(var key in numberObj){
		if(numberObj[key] === 4){
			ifFour = key;
		}else if(numberObj[key] === 3){
			ifThree = key;
		}else if(numberObj[key] === 2){
			if(ifPairOne){
				if(numbers.indexOf(numberObj[ifPairOne]) > numbers.indexOf(numberObj[key])){
					ifPairTwo = ifPairOne;
					ifPairOne = key;
				}else{
					ifPairTwo = key;
				}
			}else{
				ifPairOne = key;
			}
		}
	}

	var hand=[];
	// start checking car strength
	if(ifFour){			//quatz
		var fifthCard = 0;
		sevenCards.forEach(function(card){
			if(card.number === ifFour){
				hand.push(card);
			}
		});
		while(sevenCards[fifthCard].number === ifFour){
			fifthCard++;
		}
		hand.push(sevenCards[fifthCard]);
		return [1,hand];
	}else if(ifThree && ifPairOne){  //full house
		sevenCards.forEach(function(card){
			if(card.number === ifThree){
				hand.push(card);
			}
		});		
		sevenCards.forEach(function(card){
			if(card.number === ifPairOne){
				hand.push(card);
			}
		});			
		return [2,hand];		
	}else if(self.ifFlush(sevenCards)){      // check flush or straight-flush
		var maxSuit = self.ifFlush(sevenCards);
		var suitedNumbArr = [];

		sevenCards.forEach(function(card){
			if(card.suit === maxSuit){
				suitedNumbArr.push(card.number);
			}
		});

		sevenCards.forEach(function(card){
			if(card.suit === maxSuit && hand.length<5){
				hand.push(card);
			}
		});

		if(self.ifStraight(suitedNumbArr) !== false){  // straight-flush
			return [0,hand];
		}else{				//flush	
			return [3,hand];			
		}
	}else if(self.ifStraight(numberArr) !== false){  // straight
		var firstIndex = self.ifStraight(numberArr);
		sevenCards.forEach(function(card){
			if(card.number === numbers[firstIndex] && hand.length<5){
				hand.push(card);
			}
			firstIndex++;
		});	
		return [4,hand];
	}else if(ifThree){
		sevenCards.forEach(function(card){
			if(card.number === ifThree){
				hand.push(card);
			}
		});	
		sevenCards.forEach(function(card){
			if(card.number !== ifThree && hand.length<5){
				hand.push(card);
			}
		});		
		return [5,hand];					
	}else if(ifPairTwo){
		sevenCards.forEach(function(card){
			if(card.number === ifPairOne){
				hand.push(card);
			}
			if(card.number === ifPairTwo){
				hand.push(card);
			}				
		});	
		sevenCards.forEach(function(card){
			if(card.number !== ifPairOne && card.number !== ifPairTwo && hand.length<5){
				hand.push(card);
			}
		});			
		return [6,hand];				
	}else if(ifPairOne){
		sevenCards.forEach(function(card){
			if(card.number === ifPairOne){
				hand.push(card);
			}				
		});		
		sevenCards.forEach(function(card){
			if(card.number !== ifPairOne && hand.length<5){
				hand.push(card);
			}				
		});			
		return [7,hand];		
	}else{
		hand = sevenCards.slice(0,5);
		return [8,hand];		
	}
}

Game.prototype.getWinners = function(){
	var self = this;
	var candidates = self.sockets.filter(function(socket){
		return socket && (socket.player.status === 2 || socket.player.status === 4);
	}).map(function(socket){

		var id = socket.player.seatId;
		var hand = self.getHand(id);
		
		var combine = hand[1].map(function(h){
			return numbers.indexOf(h.number);
		});
		combine.unshift(hand[0]);

		console.log(combine);
		// [id,rank,combined hand]
		return [id,0,combine];
	});

	// sort candidates based on hand strength
	candidates.sort(function(a,b){
		return a[2][0]-b[2][0] || a[2][1]-b[2][1] || a[2][2]-b[2][2] ||
			   a[2][3]-b[2][3] || a[2][4]-b[2][4] || a[2][5]-b[2][5];
	});

	// get a list of hands in order, transfer the array into string
	var handList = candidates.map(function(candidate){
		return candidate[2].join("-");
	});

	// get ranking for players and select those ranks zero(winners)
	candidates = candidates.map(function(candidate,index){
		console.log(index);
		candidate[1] = handList.indexOf(candidate[2].join("-"));
		console.log(candidate);
		return candidate;
	})

	console.log("candidates: "+candidates);

	var winners = candidates.filter(function(candidate){
		return candidate[1]===0;
	});

	console.log("winners: "+winners);

	// rank the winner by totalBet from lowest to highest
	winners.sort(function(a,b){
		return self.sockets[a[0]].player.totalBet-self.sockets[b[0]].player.totalBet;
	});

	return winners;
}

///////////////////////////////////////////////////////////////////////////
// method to split pot
///////////////////////////////////////////////////////////////////////////

// splitting methodology:
// seperate winners and losers, winners will split losers money, then take back own money.
// to split losers money, firstly loop through each loser, then compare his bet with 
// each winner (lowest bet to higheset bet). If loser's bet is smaller than or equal to
// winner's bet for current compare, which means all the money from current loser will be 
// splitted without anything left. Otherwise if loser's bet is greater than current winner's bet,
// splitted only that part of loser's bet, then go to next winner with higher bet.
Game.prototype.splitPot = function(winners){
	var self = this;
	var winnersCount = winners.length;
	// winners.forEach(function(winner){
	// 	winner.push(self.possibleMaxProfit(winner[0]));
	// });

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

	console.log(losersBet);

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
			console.log("loaserbet: "+loserBet);
			var curProfit = 0;
			if(loserBet<=self.sockets[winnersId[i]].player.totalBet){
				console.log("curProfit1: "+curProfit);
				curProfit = loserBet - (!i?0:self.sockets[winnersId[i-1]].player.totalBet);
				console.log("curProfit2: "+curProfit);
				checker = false;
			}else{
				curProfit = self.sockets[winnersId[i]].player.totalBet - 
					(!i?0:self.sockets[winnersId[i-1]].player.totalBet);
			}

			console.log("THIs round of profit: "+i+" "+curProfit);

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
				console.log("get money: "+ curProfit);				
			}

			i++;
		}; //end of while loop
	});

	// winners get own money back
	winnersId.forEach(function(id){
		console.log("Player bet: "+self.sockets[id].player.totalBet)
		self.sockets[id].player.stack += self.sockets[id].player.totalBet;
	});

	// clean up after split
	self.sockets.forEach(function(socket){
		if(socket){
			socket.player.curBet = 0;
			socket.player.totalBet = 0;
		}
	});
	self.pot = 0;
}


module.exports = Game;