// "use strict";

console.log("linked");

$(function(){

	// $(window).on('beforeunload',function(){
	// 	console.log('sdfsd');
	
	// });

	var socket;
	var countDown;
	var playerInfo = {    // used to send 
		"DBId" : undefined,
		"seatId" : undefined,	 // client info to server
		"username" : "",
		"stack" : 0,	// not include curBet
		"status" : 0,
		"curBet" : 0,	// money on table for this round
		"curMax" : 0,   // highest bet for current round(pre-flop, river)
		"inGame" : false //is the player is playing
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
	$("#minusOne").on("click",function(event){
		var newVal = Math.max(+$("#slider").val()-1,0);
		$("#slider").val(newVal);
		$("#sliderValue").text("$ "+newVal);
		btnValidation();
	});
	$("#plusOne").on("click",function(event){
		var newVal = Math.min(+$("#slider").val()+1,$("#slider").attr("max"));
		$("#slider").val(newVal);
		$("#sliderValue").text("$ "+newVal);
		btnValidation();
	});
	$("#slider").on("change",function(event){
		btnValidation();
	});


	function btnValidation(){
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
	// after join Game, sockets event's are defined
	$("#joinGame").on("click",function(event){
		// buyin information
		playerInfo.stack = +$("input[name=buyin]").val();


		if( !playerInfo.stack ){
			alert('you must input buyin');
		}else{
			// console.log(User);
			// var record = User.find({},function(err,users){
			// 	console.log(users);
			// });

		    $(window).on('unload',function(){
		    	// console.log(playerInfo.stack);
		    	var stk = -playerInfo.stack;
				// updateDBStack(playerInfo.DBId,stk,function(){	
				// 	// socket.emit("deleteSocket");	
				// 	// socket = undefined;	
				// 	// socket.disconnect();			
				// });
				$.ajax({
					type: "PUT",
					url: "/user/"+playerInfo.DBId,
					data: "stack="+stk,
					async: false,
					success: function(data){
						// if(func){
						// 	func();
						// }
						// console.log('success');
					}
				});
		    });	

			$.ajax({
				method: "GET",
				url: "/getuserinfo",
				success: function(data){
					var userinfo = JSON.parse(data)[0];

					updateDBStack(userinfo._id,playerInfo.stack,function(){
						console.log("update stack");
					});
					
					playerInfo.DBId = userinfo._id;
					playerInfo.username = userinfo.firstname;

					$("#signupModal").hide();
					$(".ctrlBtn").prop('disabled',true);
					$(".gameBtn").prop('disabled',true);
					$("#rebuyBtn").prop('disabled',false);
					$("#returnLobby").prop('disabled',false);

					// join game by clicking on one of the seat
					$(".seat").on("click",function(event){
						playerSeatDown(event);
					});

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
									textStatus = "Away"; 
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
							displayStatus(id,"Away");
						}
					});

					//opposite to player_seatDown
					socket.on("player_standUp",function(seatId){
						// console.log(seatId + " stand up")
						cleanupPlayerDisplay(seatId);
						$(".seat").eq(seatId).on("click",function(event){
							playerSeatDown(event);
						});					
					});

					socket.on('player_left',function(seatId){
						cleanupPlayerDisplay(seatId);
					});

					function cleanupPlayerDisplay(seatId){
						displayBet(seatId,"");
						displayName(seatId,"");
						displayStack(seatId,"");
						displayStatus(seatId,"Empty Spot");
						$(".seat").eq(seatId).removeClass("activePlayer");
					}

					socket.on('rebuy',function(data){
						displayStack(data[0],data[1]);
					})

					// a player on the table's ready
					socket.on("player_ready",function(seatId){
						displayStatus(seatId,"Ready");
					});

					socket.on("player_break",function(request){
						var $targetDiv = $(".seat").eq(request);
						displayAction(request,'');
						displayBet(request,'');	
										
						if( request !== playerInfo.seatId ){
							displayStatus(request,'Away');				
						}else {
							$("#winnerDisplay").show();	
							$("#winnerDisplay").text("Click Ready to Play");
							playerInfo.status = 3;
							// playerInfo.inGame = false;
							displayStatus(request,'');
							displayAction(request,'');
							displayBet(request,'');
							$('#breakBtn').prop('disabled',true);
							$('#standupBtn').prop('disabled',false);
							$('#rebuyBtn').prop('disabled',false);	
							$targetDiv.find(".cardDisplay").append("<button id=\"readyBtn\" class=\"btn btn-sm btn-success\">Ready</button>");	
							$("#readyBtn").on("click",function(event){
								if( playerInfo.stack < 2 ){
									alert('You need to rebuy to keep playing.');
								}else{
									playerInfo.status = 2;
									// playerInfo.inGame = true;
									$("#winnerDisplay").text("Waiting for More Players/Next Round");
									socket.emit("i_ready",playerInfo.seatId);
									deactivePanal();
									$('#breakBtn').prop('disabled',false);
								}
							});	
						}	
					});

					// count down control
					socket.on('show_time_left',function(request){
						$("#timeLeft").text(request);
						$("#winnerDisplay").hide();	
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
						playerInfo.status = 2;
						$(".betAmount").text("");
						$('.gameBtn').prop('disabled',true);
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

					socket.on("update_action",function(request){
						// adjust ss/bb bet
						if( request[0][0] === "*" ){
							request[0] = +request[0].slice(1);
							if( playerInfo.seatId === request[0]){
								playerInfo.curBet = request[3];
								playerInfo.stack -= playerInfo.curBet;
							}
						}	
						
						updateDisplay(request[0],request[1],request[2],request[3],request[4]);

						if( playerInfo.status === 2 || playerInfo.status === 4 ){
							
							// current highest bet (request[5]) is updated everytime a msg received
							playerInfo.curMax = request[5];											
						}											
					});

					socket.on('send_boardcards',function(request){
						// console.log("cards: "+request[6]);
						// show cards, let next player to action in callback function
						displayBoard(request);

						playerInfo.curBet = 0;
						playerInfo.curMax = 0;
						$(".betAmount").text("");
						$(".actionDisplay").text("");
					});

					socket.on("action_required",function(request){
						// console.log("request: "+request);

						if( playerInfo.status === 2 || playerInfo.status === 4 ){
								// let next player to action
								activePlayer(request);
										
						}						
					});

					// when there is winners, this msg will be sent out from server
					socket.on("win",function(request){
						// console.log("winner update: ");
						// console.log(request);
						// clean up pot diaplay
						$("#potDisplay").empty();

						// buttons resetting
						if( playerInfo.status === 2 ){
							$(".ctrlBtn").prop('disabled',true);
							$("#breakBtn").prop('disabled',false);							
						}
						
						// reset status
						playerInfo.status = 2;

						// update player stack and show on board
						request[1].forEach(function(player,index){
							if( player ){
								if( playerInfo.seatId === index ){
									playerInfo.stack = +player[1];
								}
								displayStack(index,player[1]);
							}
						});

						// get winners name and display
						// console.log(request[0]);
						var winnersName = "";
						if( request[0].length>1 ){
							request[0].forEach(function(winner){
								winnersName += request[1][winner[0]][2]+" ";
							});
						}else{
							winnersName += request[1][request[0][0][0]][2];
						}
						$("#winnerDisplay").text("Winner: "+winnersName);
						
						// setTimeout(function(){
							$("#winnerDisplay").fadeIn();
						// },2000);						
						setTimeout(function(){
							$("#winnerDisplay").fadeOut();
						},4000);
						// updateDisplay(request[0],request[1],request[2],request[3],request[4]);
						// $(".betAmount").text("");
					});	
					
				}
			});			
		
		}

	});


	// event listener for buttons
	$("#breakBtn").on("click",function(event){	
		// deactivePanal();
		playerInfo.status = 3;
		// playerInfo.inGame = false;
		$('.gameBtn').prop('disabled',false);
		$('#breakBtn').prop('disabled',true);
		$('#returnLobby').prop('disabled',true);
		// socket.emit("action_taken",[playerInfo.seatId,"FOLD",undefined]);
		$("#winnerDisplay").text("Click Ready to Play");
		$("#winnerDisplay").show();	
		socket.emit("i_break",playerInfo.seatId);
	});

	$("#rebuyBtn").on("click",function(event){
		$("#rebuyModal").show();
	});

	$("#rebuyConfirm").on("click",function(event){
		var amount= +$("[name=rebuyAmount]").val();
		$("[name=rebuyAmount]").val("");
		playerInfo.stack += amount;
		// displayStack(playerInfo.seatId,playerInfo.stack);
		updateDBStack(playerInfo.DBId,amount);
		$("#rebuyModal").hide();
		socket.emit("rebuy",amount);
	});

	$("#standupBtn").on("click",function(event){
		// deactivePanal();
		// socket.emit("action_taken",[playerInfo.seatId,"FOLD",undefined]);
		$('#standupBtn').prop('disabled',true);
		$('#returnLobby').prop('disabled',false);
		var $seats = $(".seat");
		for(var i=0;i<$seats.length;i++){
			if($seats.eq(i).find(".cardDisplay").text() == "Empty Spot"){
				$seats.eq(i).on("click",function(event){
					playerSeatDown(event);
				});
			}
		}		
		$("#winnerDisplay").text("Click Empty Spot to Join");
		socket.emit("i_standUp",playerInfo.seatId);	
		playerInfo.seatId = undefined;
		playerInfo.status = 0;
	});

	$("#leaveBtn").on("click",function(event){
		socket.disconnect();
	});

	// game action event listener
	$("#checkBtn").on("click",function(event){
		deactivePanal();
		socket.emit("action_taken",[playerInfo.seatId,"CHECK",undefined]);
	});

	$("#foldBtn").on("click",function(event){
		// deactive all the control buttons
		// and active break btn
		$(".ctrlBtn").prop('disabled',true);
		$("#breakBtn").prop('disabled',false);

		// change status
		playerInfo.status = 3;
		// playerInfo.inGame = false;	
		socket.emit("action_taken",[playerInfo.seatId,"FOLD",undefined]);
	});

	$("#callBtn").on("click",function(event){
		// console.log('call: ');
		// console.log(playerInfo);
		playerInfo.stack = playerInfo.stack - (playerInfo.curMax - playerInfo.curBet);	
		playerInfo.curBet = playerInfo.curMax;
		deactivePanal();
		// console.log(playerInfo);
		socket.emit("action_taken",[playerInfo.seatId,"CALL",playerInfo.curBet]);
	});	

	$("#betBtn").on("click",function(event){
		// console.log('bet: ');
		// console.log(playerInfo);
		playerInfo.curBet = +$("#slider").val();
		playerInfo.stack -= playerInfo.curBet;	
		deactivePanal();
		var action = "BET";
		if( playerInfo.stack === 0){
			action = "ALLIN";
		}
		// console.log(playerInfo);
		socket.emit("action_taken",[playerInfo.seatId,action,playerInfo.curBet]);
	});	

	$("#raiseBtn").on("click",function(event){
		// console.log('raise: ');
		// console.log(playerInfo);	
		playerInfo.stack = playerInfo.stack - ( (+$("#slider").val()) - playerInfo.curBet);
		playerInfo.curBet = +$("#slider").val();
		deactivePanal();
		var action = "RAISE";
		if( playerInfo.stack === 0){
			action = "ALLIN";
		}
		// console.log(playerInfo);
		socket.emit("action_taken",[playerInfo.seatId,action,playerInfo.curBet]);
	});

	$("#allinBtn").on("click",function(event){
		// console.log('allin');
		// console.log(playerInfo);
		deactivePanal();
		$("#breakBtn").prop('disabled',false);
		playerInfo.curBet += playerInfo.stack;
		playerInfo.stack = 0;	
		playerInfo.status = 4;
		// console.log(playerInfo);
		socket.emit("action_taken",[playerInfo.seatId,"ALLIN",playerInfo.curBet]);
	});

	// $("#returnLobby").on("click",function(event){	
	// 	console.log('return lobyy runn');
	// 	updateDBStack(playerInfo.DBId,-playerInfo.stack,function(){	
	// 		// socket.emit("deleteSocket");	
	// 		// socket = undefined;	
	// 		socket = undefined;
	// 		console.log(socket);		
	// 		window.location.href="/";
	// 	});
	// });

//     $(window).on('unload',function(){
// 		updateDBStack(playerInfo.DBId,-playerInfo.stack,function(){	
// 			socket.emit("deleteSocket");	
// 			socket = undefined;				
// 		});
//     });	
// console.log(window.location.href);


	$("#cancelRebuy").on("click",function(event){
		$("#rebuyModal").hide();
		$("[name=rebuyAmount]").val("");
	});

	function updateDBStack(id,stack,func){
		// console.log(id);
		// console.log(typeof id);
		// console.log(stack);
		// console.log(typeof stack);		
		$.ajax({
			type: "PUT",
			url: "/user/"+id,
			data: "stack="+stack,
			// async: false,
			success: function(data){
				if(func){
					func();
				}
				// console.log('success');
			}
		});
	}


	function playerSeatDown (event){
		// console.log("i seat down");
		var $targetDiv = $(event.target).closest("[seat]");
		var id = +$targetDiv.attr("seat");

		playerInfo.seatId = id;
		playerInfo.status = 1;	

		$("#winnerDisplay").text("Click Ready to Play");
		// $targetDiv.addClass("seatedPlayer");
		$targetDiv.find(".cardDisplay").text("");
		$targetDiv.find(".cardDisplay").append("<button id=\"readyBtn\" class=\"btn btn-success\">Ready</button>");			
		$("#readyBtn").on("click",function(event){
			if( playerInfo.stack < 2 ){
				alert('You need to rebuy to keep playing.');
			}else{
				$("#winnerDisplay").text("Waiting for More Players/Next Round");
				playerInfo.status = 2;
				// playerInfo.inGame = true;
				$('.gameBtn').prop('disabled',true);
				$('#breakBtn').prop('disabled',false);
				socket.emit("i_ready",playerInfo.seatId);
			}
		});	
		$(".seat").off("click");

		$('#standupBtn').prop('disabled',false);
		$('#returnLobby').prop('disabled',true);
		socket.emit("i_seatDown",id);
	}

	// function playerStandUp (event){
	// 	console.log("i stand up");	
	// 	var $seats = $(".seat");

		// for(var i=0;i<$seats.length;i++){
		// 	if($seats.eq(i).find(".cardDisplay").text() == "Empty Spot"){
		// 		$seats.eq(i).on("click",function(event){
		// 			playerSeatDown(event);
		// 		});
		// 	}
		// }

	// 	displayStack(playerInfo.seatId,"");
	// 	displayName(playerInfo.seatId,"");
	// 	displayStatus(playerInfo.seatId,"Empty Spot");

	// 	socket.emit("i_standUp",playerInfo.seatId);	
	// 	playerInfo.seatId = undefined;
	// 	playerInfo.status = 0;
	// }

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
	}

	function deactivePanal(){
		// deactive all the control buttons
		$(".ctrlBtn").prop('disabled',true);

		// do not allow player to leave if he is not current player
		$('.gameBtn').prop('disabled',true);

		$("#slider").val(0);
		$("#sliderValue").text("$ 0");
	}

	function updateDisplay(id,stack,action,amount,pot){
		$("#potDisplay").text("Pot: $"+pot);
		// no need to update display when player left,
		// because the display has been cleaned up already

		if( action === "BET" || action === "CALL" || action === "RAISE" || action === "ALLIN"){
			// console.log("display bet: "+amount);
			displayBet(id,amount);
		}
		displayStack(id,stack);
		displayAction(id,action);
		$("[seat="+id+"]").removeClass("activePlayer");			

	}

	function activePlayer(id){
		//add class to active player
		// console.log('id to display: '+id);
		// console.log(typeof id);
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
		};
		$(".seat").eq(id).find(".betAmount").text(bet);
	}

	function disableClick(id){
		$(".seat").eq(id).off("click");
	}

});

