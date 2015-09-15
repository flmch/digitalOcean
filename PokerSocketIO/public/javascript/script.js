"use strict";

console.log("linked");

$(function(){

	var socket;
	var countDown;
	var playerInfo = {    // used to send 
		"seatId" : undefined,	 // client info to server
		"username" : "",
		"stack" : 0,	// not include curBet
		"status" : 0,
		"curBet" : 0,	// money on table for this round
		"curMax" : 0   // highest bet for current round(pre-flop, river)
	};

	var suits = ["C","S","H","D"];
	var numbers = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];

	// populate each player's div
	$(".seat").append("<div class=\"dealerBtn\" style=\"display: none\">"+
						"<img src='../images/dealerBtn.png'>"+"</div>"+
					  "<div class=\"betAmount\"></div>"+
					  "<div class=\"cardDisplay\"></div>"+
					  "<div class=\"nameDisplay\"></div>"+
					  "<div class=\"stackDisplay\"></div>"+
					  "<div class=\"actionDisplay\"></div>");

	// populate control panel 
	$("#minusOne").on("click",function(){
		var newVal = Math.max(+$("#slider").val()-1,0);
		$("#slider").val(newVal);
		$("#sliderValue").text("$ "+newVal);
		btnValidation(event);
	});
	$("#plusOne").on("click",function(){
		var newVal = Math.min(+$("#slider").val()+1,$("#slider").attr("max"));
		$("#slider").val(newVal);
		$("#sliderValue").text("$ "+newVal);
		btnValidation(event);
	});
	$("#slider").on("change",function(event){
		btnValidation(event);
	});


	function btnValidation(event){
		var curVal = +$("#slider").val();
		var minVal = +$("#slider").attr('min');
		$("#sliderValue").text("$ "+curVal);
		if( minVal == 0){
			if( curVal>=2 ){
				$('#betBtn').prop('disabled',false);
			}else{
				$('#betBtn').prop('disabled',true);
			}			
		}else{
			if( curVal>=2*minVal ){
				$('#raiseBtn').prop('disabled',false);
			}else{
				$('#raiseBtn').prop('disabled',true);
			}				
		}		
	}

	// when username and inital buyin is inputed, fire the event
	$("#joinGame").on("click",function(event){
		// save username and buyin information
		playerInfo.username = $("input[name=username]").val();
		playerInfo.stack = +$("input[name=buyin]").val();

		if( !playerInfo.username || !playerInfo.stack ){
			alert('you must input username and buyin');
		}else{
			$("#signupModal").hide();
			$(".ctrlBtn").prop('disabled',true);

			// create socket connection with server
			// sent out initiate_player msg to server,
			// server will send back initiate_table msg with current table status
			socket = io();
			socket.emit("initiate_player",playerInfo);
			socket.on("initiate_table",function(tableStatus){
				// display current table status
				tableStatus.forEach(function(player,index){
					var textStatus = "";
					if(!player){	
						textStatus = "Empty Spot";
					}else{
						if(player.status === 1){
							textStatus = "seated"; 
						}else if(player.status === 2){
							textStatus = "Ready"; 
						} 
						displayName(index,player.username);
						displayStack(index,player.stack);
		 				disableClick(index);
					}
					displayStatus(index,textStatus);
				});
			});

			// when another player seat down at the table, 
			// display this new player
			socket.on("player_seatDown",function(newPlayerInfo){
				var id = newPlayerInfo.seatId;
				displayName(id,newPlayerInfo.username);
				displayStack(id,newPlayerInfo.stack);
				if( id !== playerInfo.seatId ){
					disableClick(id);
					displayStatus(id,"seated");
				}
			});

			//opposite to player_seatDown
			socket.on("player_standUp",function(seatId){
				cleanupPlayerDisplay(seatId);
			});

			socket.on('player_left',function(seatId){
				cleanupPlayerDisplay(seatId);
			});

			function cleanupPlayerDisplay(seatId){
				var $targetDiv = $(".seat").eq(seatId);
				displayName(seatId,"");
				displayStack(seatId,"");
				displayStatus(seatId,"Empty Spot");
				$targetDiv.on("click",function(event){
					playerSeatDown(event);
				});	
			}

			// a player on the table's ready
			socket.on("player_ready",function(seatId){
				displayStatus(seatId,"Ready");
			});

			socket.on("player_break",function(request){
				var $targetDiv = $(".seat").eq(request);
				if( request !== playerInfo.seatId ){
					displayStatus(request,'seated');				
				}else {
					displayStatus(request,'');
					displayAction(request,'');
					displayBet(request,'');
					$targetDiv.find(".cardDisplay").append("<button id=\"readyBtn\" class=\"btn btn-sm btn-success\">Ready</button>");	
					$("#readyBtn").on("click",function(event){
						if( playerInfo.stack < 2 ){
							alert('You need to rebuy to keep playing.');
						}else{
							socket.emit("i_ready",playerInfo.seatId);
						}
					});	
				}	
			});

			// count down control
			socket.on('show_time_left',function(request){
				$("#timeLeft").text(request);
				$("#countDownDisplay").show();		
			});

			socket.on('stop_count_down',function(){
				$("#timeLeft").text("");
				$("#countDownDisplay").hide();
			});

			// when this msg received, a new game is starting,
			// display should be updated and clean up.
			// when dealer button position is updated, 
			// display the new position
			socket.on("dealer_Btn",function(position){
				$(".betAmount").text("");
				$("#rebuyBtn").prop('disabled',true);
				$("#boardCard").empty();
				$(".dealerBtn").hide();
				$("[seat="+position+"]").find(".dealerBtn").show();
			});

			// function when player receive two cards
			socket.on("send_cards",function(cards){
				//this message means new game starts
				//dispaly cards

				var card1index = numbers.indexOf(cards[0].number)*4 + suits.indexOf(cards[0].suit)+1;
				var card2index = numbers.indexOf(cards[1].number)*4 + suits.indexOf(cards[1].suit)+1;

				playerInfo.status = 2;
				playerInfo.cards = cards;
				var $seats = $(".seat");
				for(var i=0;i<$seats.length;i++){
					if( i === playerInfo.seatId ){
						//show card
						displayStatus(i,'');
						$seats.eq(i).find(".cardDisplay").append("<div class=\"card1\"><img src=\"/images/cards/"+card1index+".png\"></div>"+
							"<div class=\"card2\"><img src=\"/images/cards/"+card2index+".png\"></div>");				
					}else if($seats.eq(i).find(".nameDisplay").text() !== ""){
						//show back of card
						displayStatus(i,'');
						$seats.eq(i).find(".cardDisplay").append("<div class=\"card1\"><img src=\"/images/cards/b1fv.png\"></div>"+
							"<div class=\"card2\"><img src=\"/images/cards/b1fv.png\"></div>");				
					}
				}
			});

			// the core msg server used to communicate with client,
			// the request contained info about detailed action of last move
			// and client(palyer) who should take action now is required to 
			// send back msg  
			socket.on("action_required",function(request){

				// adjust ss/bb bet
				if( request[0][0] === "*" ){
					request[0] = +request[0].slice(1);
					if( playerInfo.seatId === request[0]){
						playerInfo.curBet = request[3];
						playerInfo.stack -= playerInfo.curBet;
					}
				}

				updateDisplay(request[0],request[1],request[2],request[3],request[4]);

				// current highest bet (request[5]) is updated everytime a msg received
				playerInfo.curMax = request[5];				

				// if there are new cards on board. show them
				if(request[6]){
					// show cards, let next player to action in callback function
					displayBoard(request[6]);

					playerInfo.curBet = 0;
					playerInfo.curMax = 0;
					$(".betAmount").text("");
					$(".actionDisplay").text("");
				};

				// if action if required from a player, active his control panal
				if(request[7]){
					// let next player to action
					activePlayer(request[7]);
				}				
				
			});

			// when there is winners, this msg will be sent out from server
			socket.on("win",function(request){
				$("#potDisplay").empty();
				$(".ctrlBtn").prop('disabled',true);
				$("#rebuyBtn").prop('disabled',false);
				var winnersName = "";
				request[1].forEach(function(player,index){
					if( player ){
						if( playerInfo.seatId === index ){
							playerInfo.stack = +player[1];
						}
						$('.seat').eq(index).find('.stackDisplay').text(player[1]);
						
					}
				});

				if( typeof request[0] === 'object'){
					request[0].forEach(function(winner){
						winnersName += request[1][winner[0]][2]+" ";
					});
				}else{
					winnersName += request[1][request[0]][2];
				}
				$("#winnerDisplay").text("Winner: "+winnersName);
				$("#winnerDisplay").show();
				setTimeout(function(){
					$("#winnerDisplay").fadeOut();
				},4000);
				// updateDisplay(request[0],request[1],request[2],request[3],request[4]);
				// $(".betAmount").text("");
			});			
		}


		
	});

	// player join the game after click on one of the seat
	$(".seat").on("click",function(event){
		playerSeatDown(event);
	});

	$("#breakBtn").on("click",function(event){	
		socket.emit("i_break",playerInfo.seatId);
	});

	$("#rebuyBtn").on("click",function(event){
		$("#rebuyModal").show();
	});

	$("#rebuyConfirm").on("click",function(event){
		var amount= +$("[name=rebuyAmount]").val();
		$("[name=rebuyAmount]").val("");
		playerInfo.stack += amount;
		displayStack(playerInfo.seatId,playerInfo.stack);
		$("#rebuyModal").hide();
		socket.emit("rebuy",amount);
	});

	$("#standupBtn").on("click",function(event){
		playerStandUp(event);
	});

	$("#leaveBtn").on("click",function(event){
		socket.disconnect();
	});

	// game action evetn listener
	$("#checkBtn").on("click",function(event){
		deactivePanal();
		socket.emit("action_taken",[playerInfo.seatId,"CHECK",undefined]);
	});

	$("#foldBtn").on("click",function(event){
		deactivePanal();
		socket.emit("action_taken",[playerInfo.seatId,"FOLD",undefined]);
	});

	$("#callBtn").on("click",function(event){
		playerInfo.curBet = playerInfo.curMax;
		playerInfo.stack -= playerInfo.curBet;	
		deactivePanal();
		socket.emit("action_taken",[playerInfo.seatId,"CALL",playerInfo.curBet]);
	});	

	$("#betBtn").on("click",function(event){
		playerInfo.curBet = +$("#slider").val();
		playerInfo.stack -= playerInfo.curBet;	
		deactivePanal();
		var action = "BET";
		if( playerInfo.stack === 0){
			action = "ALLIN";
		}
		socket.emit("action_taken",[playerInfo.seatId,action,playerInfo.curBet]);
	});	

	$("#raiseBtn").on("click",function(event){
		playerInfo.curBet = +$("#slider").val();
		playerInfo.stack -= playerInfo.curBet;
		deactivePanal();
		var action = "RAISE";
		if( playerInfo.stack === 0){
			action = "ALLIN";
		}
		socket.emit("action_taken",[playerInfo.seatId,action,playerInfo.curBet]);
	});

	$("#allinBtn").on("click",function(event){
		deactivePanal();
		playerInfo.curBet += playerInfo.stack;
		playerInfo.stack = 0;	
		displayBet(playerInfo.seatId,playerInfo.curBet);
		socket.emit("action_taken",[playerInfo.seatId,"ALLIN",playerInfo.curBet]);
	});

	$("#startGame").on("click",function(event){
		socket.emit("start_game");
	});

	function playerSeatDown (event){
		// console.log("i seat down");
		var $targetDiv = $(event.target).closest("[seat]");
		var id = +$targetDiv.attr("seat");

		playerInfo.seatId = id;
		playerInfo.status = 1;	

		// $targetDiv.addClass("seatedPlayer");
		$targetDiv.find(".cardDisplay").text("");
		$targetDiv.find(".cardDisplay").append("<button id=\"readyBtn\" class=\"btn btn-success\">Ready</button>");			
		$("#readyBtn").on("click",function(event){
			if( playerInfo.stack < 2 ){
				alert('You need to rebuy to keep playing.');
			}else{
				socket.emit("i_ready",playerInfo.seatId);
			}
		});	
		$(".seat").off("click");

		socket.emit("i_seatDown",id);
	}

	function playerStandUp (event){
		// console.log("i stand up");	
		var $seats = $(".seat");

		for(var i=0;i<$seats.length;i++){
			if($seats.eq(i).find(".cardDisplay").text() == "Empty Spot"){
				$seats.eq(i).on("click",function(event){
					playerSeatDown(event);
				});
			}
		}

		displayStack(playerInfo.seatId,"");
		displayName(playerInfo.seatId,"");
		displayStatus(playerInfo.seatId,"Empty Spot");

		socket.emit("i_standUp",playerInfo.seatId);	
		playerInfo.seatId = undefined;
		playerInfo.status = 0;
	}

	function activePanal(){

		var $slider = $("#slider");
		var $sliderVal = $("#sliderValue");

		$slider.val(0);
		$sliderVal.val("0");
		$slider.attr('max',playerInfo.stack);
		$slider.attr('min',playerInfo.curMax);

		//active all control buttons first
		$('.ctrlBtn').prop('disabled',false);

		//deactive specific button case by case
		if( playerInfo.curMax === 0){
			$('#betBtn').prop('disabled',true);
			$('#callBtn').prop('disabled',true);
			$('#raiseBtn').prop('disabled',true);
		}else if( playerInfo.curMax >= ( playerInfo.curBet + playerInfo.stack ) ){
			$('.ctrlBtn').prop('disabled',true);
			$('#foldBtn').prop('disabled',false);
			$('#allinBtn').prop('disabled',false);
		}else if( playerInfo.curMax > playerInfo.curBet ){
			$('#checkBtn').prop('disabled',true);
			$('#betBtn').prop('disabled',true);
			$('#raiseBtn').prop('disabled',true);
		}else if( playerInfo.curMax === playerInfo.curBet ){
			$('#callBtn').prop('disabled',true);
			$('#raiseBtn').prop('disabled',true);
		}

		// can not step away or stand up if his action is required
		$('.gameBtn').prop('disabled',true);
	}

	function deactivePanal(){
		// deactive all the control buttons
		$(".ctrlBtn").prop('disabled',true);

		// allow player to leave if he is not current player
		$('.gameBtn').prop('disabled',false);

	}

	function updateDisplay(id,stack,action,amount,pot){
		$("[seat="+id+"]").removeClass("activePlayer");
		displayStack(id,stack);
		displayAction(id,action);
		$("#potDisplay").text("Pot: $"+pot);
		if( action === "BET" || action === "CALL" || action === "RAISE" ){
			displayBet(id,amount);
		}
	}

	function activePlayer(id){
		//add class to active player
		$("[seat="+id+"]").addClass("activePlayer");
		//active panel
		if( id === playerInfo.seatId ){
			activePanal();
		}
	}

	function displayBoard(boardCard){
		var $currentCards = $("#boardCard").children();	
		var cardsShown = $currentCards.length;
		for(var i=cardsShown;i<boardCard.length;i++){
			// var timeout = 0;
			// if(cardsShown===0){
			// 	if(i === 3 || i === 4){
			// 		timeout = i-2;
			// 	}				
			// }else if(cardsShown===3){
			// 	if(i === 4){
			// 		timeout = 1;
			// 	}
			// }
			// setTimeout(function(){
			// 	console.log(i);
			// 	console.log(boardCard);
				appendCardToBoard(boardCard[i]);
			// },timeout*1000,i);
		}
	}

	// append one card to Board
	function appendCardToBoard(card){
		var cardindex = numbers.indexOf(card.number)*4 + suits.indexOf(card.suit)+1;
		var $cards = $("<span class=\"COB\"><img src=\"/images/cards/"+cardindex+".png\"></span>");
		$cards.hide().appendTo($("#boardCard")).fadeIn(1000);
		// $("#boardCard").append("<span class=\"COB\"><img src=\"/images/cards/"+cardindex+".png\"></span>");
	}

	function countDownFunc(begin){
		var startTime = +begin;
		var $showTime = $("#timeLeft");
		$showTime.text(startTime);
		$("#countDownDisplay").show();
		countDown = setInterval(function(){
			startTime--;
			$showTime.text(startTime);
			// if timeout, clear countdown
			if(!startTime){
				clearInterval(countDown);
				$("#countDownDisplay").hide();
			}
		},1000);
	}

	function displayStack(id,amount){
		if(amount){
			amount = "$ "+amount;
		}
		$(".seat").eq(id).find(".stackDisplay").text(amount);
	}

	function displayName(id,name){
		$(".seat").eq(id).find(".nameDisplay").text(name);
	}	

	function displayStatus(id,status){
		$(".seat").eq(id).find(".cardDisplay").text(status);
	}

	function displayAction(id,action){
		var $target = $(".seat").eq(id).find(".actionDisplay");
		$target.text(action);
		if( action.toLowerCase() === "allin" ){
			$target.css("color","red");
		}else{
			$target.css("color","black");
		}
	}	

	function displayBet(id,bet){
		if(bet){
			bet = "$ "+bet;
		}else{
			bet = "";
		}	
		$(".seat").eq(id).find(".betAmount").text(bet);
	}

	function disableClick(id){
		$(".seat").eq(id).off("click");
	}

});

