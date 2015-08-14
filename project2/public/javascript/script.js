"use strict";

console.log("linked");

$(function(){

	$("#updateVote").on("click",function(event){
		updateVote();
	});

	function updateVote (){
		var postId = +window.location.href.split("/").pop();
		var requestUrl = "/posts/"+postId+"/like";
		$.ajax({
			type: "GET",
			url: requestUrl,
			success: function(data){
				var vote = +data;
				$("#voteNum").text(vote);
			},
			error: function(err){
				console.log(err);
			}
		});		
	}

	$("#deletePostBtn").on("click",function(event){
		var $modal = $("#postModal");
		$modal.show();
		$modal.on("click",function(event){
			$modal.hide();
		});
	});

	$(".deleteCommentBtn").on("click",function(event){
		var $modal = $(event.target).closest(".singleComment").find(".commentModal");
		$modal.show();
		$modal.on("click",function(event){
			$modal.hide();
		});
	});

	$(".deleteYes").on("click",function(event){
		var urlEle = window.location.href.split("/");
		var postId = urlEle.pop();
		var $thisCommnent = $(event.target).closest(".singleComment");
		var requestUrl = "/posts/"+postId+"/comments/"+$thisCommnent.attr("commentid");
		console.log(requestUrl);
		$.ajax({
			type: "DELETE",
			url: requestUrl,
			success: function(data){
				console.log(data);
				$thisCommnent.fadeOut(100,function(event){
					$(this).remove();
				});
			}
		});
	});

	$("#postSort").on("change",function(event){
		var request = $(this).val();
		var searchContent = $("#searchContent").val();
		var requestUrl = "";
		if(request === "sort posts by"){
			requestUrl = "/posts/sort/id/asc/"+searchContent;
		}else if(request === "comment number-asc"){
			requestUrl = "/posts/sort/commentsCount/asc/"+searchContent;
		}else if(request === "comment number-desc"){
			requestUrl = "/posts/sort/commentsCount/desc/"+searchContent;
		}else if(request === "popularity-asc"){
			requestUrl = "/posts/sort/vote/asc/"+searchContent;
		}else if(request === "popularity-desc"){
			requestUrl = "/posts/sort/vote/desc/"+searchContent;
		}
		console.log(requestUrl);

		$.ajax({
			type: "GET",
			url: requestUrl,
			success: function(posts){
				posts.forEach(function(post,index){
					var curDate = new Date();
					post.postTime = getTimeDiff(post.create_date,curDate);
				});				
				renderPosts(posts);
			}
		});
	});
	
	$("#postSearch").on("click",function(event){
		var requestUrl = "";
		requestUrl = "/posts/search/"+$("#searchContent").val();

		$.ajax({
			type: "GET",
			url: requestUrl,
			success: function(posts){			
				renderPosts(posts);
			}
		});			
	});

	$(".tag").on("click",function(event){
		var requestUrl = "/tags/"+$(event.target).attr("tagid")+"/posts"
		$.ajax({
			type: "GET",
			url: requestUrl,
			success: function(posts){		
				renderPosts(posts);				
			}
		});
	});

	function renderPosts(posts){
		posts.forEach(function(post){
			var curDate = new Date();
			post.postTime = getTimeDiff(post.create_date,curDate);
		});		
		$("section").empty();
		posts.forEach(function(post){
			post.vote = post.vote || 0;
			$("section").append("<div class=\"showPost\">"+
				"<p><span><a href=\"/posts/"+post.id+"\">"+post.title+"</a></span>"+
				"<span style=\"margin-left:20px\" class=\"dateDisplay\">"+post.postTime+"</span>"+
				"<span style=\"float:right\"><span class=\"glyphicon glyphicon-thumbs-up\"></span>"+post.vote+"</span>"+
				"<span style=\"float:right\"><span class=\"glyphicon glyphicon-comment\"></span>"+post.commentsCount+"</span>"+
				"</p>"+
				"</div>");
		});				
	}

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


	
});
