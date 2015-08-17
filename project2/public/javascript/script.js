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
		var postId = window.location.href.split("/").pop();
		var commentsCount = +$("[commentsCount]").attr("commentsCount");
		console.log(postId,commentsCount);
		
		$("#deleteConfirm").append(renderDeletePost(postId,commentsCount));

		$modal.show();
		$modal.on("click",function(event){
			$modal.hide();
			$("#deleteConfirm").empty();
		});
	});


	function renderDeletePost(id,commentsCount){
		if(commentsCount >0 ){
			return "<p>Post with comments can not be deleted</p>"+
					"<button style=\"display:inline-block\" name=\"no\" class=\"btn btn-default\">Ok</button>";
		}else{
			return	"<p>Post will be deleted forever, are you sure?</p>"+	
					"<form style=\"display:inline-block\" method=\"POST\" action=\"/posts/"+id+"?_method=DELETE\">"+
						"<button style=\"margin-right:20px\" name=\"yes\" class=\"btn btn-danger\">Delete</button>"+
					"</form>"+	
					"<button style=\"display:inline-block\" name=\"no\" class=\"btn btn-default\">Cancel</button>";				
		}
	}

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
				var commentsCount = +$("[commentsCount]").attr("commentsCount");
				commentsCount--;
				$("[commentsCount]").attr("commentsCount",commentsCount);
				$("[commentsCount]").text("Comments("+commentsCount+")")
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
			requestUrl = "/posts/sort/id/desc/"+searchContent;
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

	$("[tagid]").on("click",function(event){
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

	// $("#createAccount").on("click",function(event){
	// 	$.ajax({
	// 		type: "GET",
	// 		url: "/signup",
	// 		success: function(signupform){
	// 			console.log("receivd");
	// 			console.log(signupform);
	// 		}
	// 	});
	// });

    $("#loginForm").formValidation({
    	framework: "bootstrap",
    	icon: {
            valid: 'glyphicon glyphicon-ok',
            invalid: 'glyphicon glyphicon-remove',
            validating: 'glyphicon glyphicon-refresh'    		
    	},
    	fields: {
    		email: {
    			validators: {
    				notEmpty: {
    					message: "Email is required."
    				}
    			}
    		},
    		password: {
    			validators: {
    				notEmpty: {
    					message: "Password is required."
    				}
    			}
    		}
    	}
    });

    $("#signupForm").formValidation({
    	framework: "bootstrap",
    	icon: {
            valid: 'glyphicon glyphicon-ok',
            invalid: 'glyphicon glyphicon-remove',
            validating: 'glyphicon glyphicon-refresh'      		
    	},
    	fields: {
    		email: {
    			validators: {
    				notEmpty: {
    					message: "Email is required."
    				},
    				regexp: {
    					regexp: /\w+@\w+.\w+/g,
    					message: "Email format invalid."
    				}
    			}
    		},
    		firstname: {
    			validators: {
    				notEmpty: {
    					message: "firstname required."
    				}
    			}
    		},
    		lastname: {
    			validators: {
    				notEmpty: {
    					message: "lastname required."
    				}
    			}
    		}, 
    		password: {
    			validators: {
    				notEmpty: {
    					message: "password required."
    				}
    			}
    		},
    		confirmPassword: {
    			validators: {
    				identical: {
    					field: "password",
    					message: "password doesn't match."
    				}
    			}
    		}    		
    	}
    });

	$("#postFormNew").formValidation(postValidation());
	$("#postFormEdit").formValidation(postValidation());

	function postValidation (){
		return {
			framework: 'bootstrap',
			icon: {
	            valid: 'glyphicon glyphicon-ok',
	            invalid: 'glyphicon glyphicon-remove',
	            validating: 'glyphicon glyphicon-refresh'			
			},
			fields: {
				title: {
					validators: {
						notEmpty: {
							message: "Title is required."
						}
					}
				},
				content: {
					validators: {
						notEmpty: {
							message: "Content is required."
						}
					}
				}
			}
		};		
	}
});
