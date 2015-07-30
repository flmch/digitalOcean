$(function(){
	console.log("linked");

	//append each property filter to GET url 
	function appendURL(targetURL,type,data){
		if(targetURL !== "/?"){
			targetURL += "&";
		}
		targetURL += type+"="+data;		
		return targetURL;			
	}

	//create url to get UFO results
	function getURL(){
		var targetURL = "/?";
		var location = $("#locationInput").val();
		var date = $("#dateInput").val();
		var shape = $("#shapeInput").val();
		var id = $("#idInput").val();

		if(location){
			location = location.split(",");
			location = (location[0]+", "+location[1].trim()).toLowerCase();
			targetURL = appendURL(targetURL,"l",location);
		}

		if(date){
			date = date.split("/");
			date = (+date[0])+"/"+(+date[1])+"/"+(+date[2]);
			targetURL = appendURL(targetURL,"o",date);
		}

		if(shape){
			targetURL = appendURL(targetURL,"s",shape.toLowerCase())
		}

		if(id){
			targetURL = appendURL(targetURL,"i",id);
		}

		return encodeURI(targetURL);
	}

	//clear input field
	function clearInput(){
		$("#locationInput").val("");
		$("#dateInput").val("");
		$("#shapeInput").val("");
		$("#idInput").val("");					
	}

	//add event listener to the click button
	//ajax will fetch data from server after clicked
	$("#searchUFO").on("click",function(event){
		$("#listMSG").text("");		//clean demo area
		$("#resultList").empty();
		$.ajax({
			type: "GET",
			url: getURL(),
			success: function(data){
				$("#listMSG").text(data.length+" UFOs match");
				//data is UFO object,
				//content will store all the UFO data in html format
				var content = "";
				data.forEach(function(ele){
					var oneUFO = "";
					for(var key in ele){
						oneUFO += "<strong>"+key+"</strong>"+": "+ele[key]+"<br>";									
					};
					content += "<div class=\"UFODiv\">"+oneUFO+"</div>"
				});
				$("#resultList").append(content);	
			}
		});	
		clearInput();			
	});
});