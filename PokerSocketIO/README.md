** Protocal for Message Transfer between client and server

1. Message when server requires action from user, at the same time send info about last user's move

{
	type_of_msg: "array",
	length: 8,
	schema: [ 
		(1)id_of_previous_user,
		(2)stack_amount_of_previous_user,
		(3)type_of_action_for_previous_user,
		(4)current_bet_if_applied_for_previous_user,
		(5)current_pot_size,
		(6)current_highest_bet,
		(7)card_on_board_if_new_cards_available,
		(8)id_for_first_mover_if_new_round_start
		],
	example: [
		4,
		190,
		'BET',
		10,
		16,
		10,
		undefined,
		undefined
	]
}

＊when (7) === undefined && (8) === undefined : only sending small blind info
＊when (7) === undefined && (8) !== undefined :requiring next player's action 
＊when (7) !== undefined && (8) !== undefined : new round and requiring next player's action 
＊when (7) !== undefined && (8) === undefined : all players have allin or fold

2. Message when client has taken action

{
	tyep_of_msg: 'array',
	length: '3',
	schema: [
		(1)seatId,
		(2)action_type,
		(3)current_bet_amount_if_applied
	]
}

3. Player Status Schema:

{
	0: stand up,
	1: seat down,
	2: in game, not fold or all in,
	3: joined game but fold,
	4: all in
}