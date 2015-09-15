"use strict";

var Card = require("../card/main.js");

// function Card(suit, number){
// 	this.suit = suit;
// 	this.number = number;
// }

// Game Prototype

function Game (){

	this.suits = ["S","H","C","D"]
	this.numbers = ["A","K","Q","J","T","9","8","7","6","5","4","3","2","A"];

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
	this.ifGameOn = false;
}

module.exports = Game;