/////////////////////////////////////////////////////////////////
// Functions for cards
/////////////////////////////////////////////////////////////////

'use strict';

var Card = require("../card/main.js");

var addPrototypes = function(Game){

	Game.prototype.initiateCard = function(){
		var self = this;
		self.deck = [];
		self.suits.forEach(function(suit){
			for(var i=0;i<13;i++){
				var curCard = new Card(suit,self.numbers[i]);
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

	Game.prototype.dealBoardCard = function(){
		this.deck.shift();
		this.cardsOnBoard.push(this.deck.shift());
		if(this.stage === 1){
			this.cardsOnBoard.push(this.deck.shift());
			this.cardsOnBoard.push(this.deck.shift());
		}
	}
};

module.exports = addPrototypes;

