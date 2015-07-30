"use strict";

var http = require("http");
var url = require("url");
var fs = require("fs");
var server = http.createServer();
var UFOs = JSON.parse(fs.readFileSync("sightings.json","utf8"));

//input query string 
//ouput an array of property array
function reformatQuery(query){
	if(query === ""){
		query = [];
	}else{
		query = query.split("&");		
		query = query.map(function(each){
			each = each.split("=");
			if(each[0] === 'o'){
				each[0] = "occurred";
			}else if(each[0] === 'r'){
				each[0] = "reported";
			}else if(each[0] === 'p'){
				each[0] = "posted";
			}else if(each[0] === 'l'){
				each[0] = "location";
			}else if(each[0] === 's'){
				each[0] = "shape";
			}else if(each[0] === 'd'){
				each[0] = "duration";
			}else if(each[0] === 'a'){
				each[0] = "account";
			}else if(each[0] === 'i'){
				each[0] = "id";
			}
			return each;
		});
	}
	return query;
}

//check if one UFO object match searching preference
function checkIfMatch(query, UFO){
	var checkResult = true;
	query.forEach(function(ele){
		// console.log(query);
		if(checkResult){
			if(ele[0] === "occurred" || ele[0] === "reported"){
				var date = UFO[ele[0]].split(" ")[0];
				checkResult = ele[1] === date;
			}else{
				checkResult = ele[1] === (UFO[ele[0]]+"").toLowerCase();
			}
		}
	});
	return checkResult;
} 

function handleRequest(request,response){
	var requestURL = request.url;
	if(requestURL !== "/favicon.ico"){
		if(requestURL === "/"){
			var htmlFile = fs.readFileSync("index.html","utf8");
			response.writeHead(200,{"content-type":"text/html"});
			response.write(htmlFile);
			response.end();				
		}else{
			var parsed = url.parse(requestURL);
			var requestQuery = reformatQuery(decodeURI(parsed.query));
			// console.log(decodeURI(parsed.query));
			var filteredUFOs = UFOs.filter(function(UFO){
				return checkIfMatch(requestQuery,UFO);
			});
			response.writeHead(200,{"content-type":"application/json"});
			response.write(JSON.stringify(filteredUFOs));
			response.end();			
		}
	}
};

server.on("request",handleRequest);

server.listen(6060,function(){
	console.log("Server is running...");
});

