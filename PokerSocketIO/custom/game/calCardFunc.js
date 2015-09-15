///////////////////////////////////////////////////////////////////////////
// calculate card strength
///////////////////////////////////////////////////////////////////////////

'use strict';

var addPrototype = function(Game){

	var numbers = ["A","K","Q","J","T","9","8","7","6","5","4","3","2","A"];

	Game.prototype.getSevenCards = function(id){

		var self = this;
		var sevenCards = this.sockets[id].player.cards.concat(this.cardsOnBoard);
		sevenCards.sort(function(a,b){
			return self.numbers.indexOf(a.number) - self.numbers.indexOf(b.number);
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
		});

		// sort candidates by overall bet,
		// if biggest bet is larger than second biggest bet,
		// refund for biggest bet
		candidates.sort(function(a,b){
			return b.player.totalBet - a.player.totalBet;
		});

		if( candidates[0].player.totalBet > candidates[1].player.totalBet ){

			candidates[0].player.stack += candidates[0].player.totalBet-candidates[1].player.totalBet;
			candidates[0].player.totalBet = candidates[1].player.totalBet;
		}

		candidates = candidates.map(function(socket){

			var id = socket.player.seatId;
			var hand = self.getHand(id);
			
			var combine = hand[1].map(function(h){
				return numbers.indexOf(h.number);
			});
			combine.unshift(hand[0]);

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
			candidate[1] = handList.indexOf(candidate[2].join("-"));
			return candidate;
		})

		var winners = candidates.filter(function(candidate){
			return candidate[1]===0;
		});

		// rank the winner by totalBet from lowest to highest
		winners.sort(function(a,b){
			return self.sockets[a[0]].player.totalBet-self.sockets[b[0]].player.totalBet;
		});

		return winners;
	}

};

module.exports = addPrototype;