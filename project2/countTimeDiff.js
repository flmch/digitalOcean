"use strict";

function getTimeDiff(postDate,curDate){
	var postTime="";
	var datediff = (Date.parse(postDate)-curDate)/1000;
	datediff = Math.floor(Math.abs(datediff));

	if(datediff<60){
		postTime="posted just now";
	}else{
		var year = Math.floor(datediff/3600/24/365);
		datediff -= year*365*24*3600
		var month = Math.floor(datediff/3600/24/30);
		datediff -= month*3600*24*30;
		var day = Math.floor(datediff/3600/24);
		datediff -= day*3600*24;
		var hour = Math.floor(datediff/3600);
		datediff -= hour*3600;
		var minutes = Math.floor(datediff/60);
		datediff -= minutes*60;

		if(year>0){
			postTime = "long time";
		}else if(month>0){
			postTime = month+" month"+ (month===1?"":"s");
		}else if(day>0){
			postTime = day+" day"+ (day===1?"":"s");
		}else if(hour>0){
			postTime = hour+" hour"+ (hour===1?"":"s");
		}else if(minutes>0){
			postTime = minutes+" min"+ (minutes===1?"":"s");
		}

		postTime = "posted "+postTime+" ago";					
	}

	return postTime;
}

module.exports = getTimeDiff;