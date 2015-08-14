// modules
var express = require("express");
var app = express();
var sqlite3 = require("sqlite3");
var db = new sqlite3.Database("data.db");
var ejs = require("ejs");
var fs = require("fs");
var getTimeDiff = require("./countTimeDiff.js")

var bodyParser = require("body-parser");
var methodOverride = require("method-override");

app.use(bodyParser.urlencoded({extend:false}));
app.use(methodOverride("_method"));
app.use(express.static(__dirname + '/public'));
app.set("view_engine","ejs");

app.get("/",function(req,res){
	db.all("SELECT * FROM posts",function(err,posts){
		if(err) console.log(err);		
		db.all("SELECT * FROM tags",function(err,tags){
			if(err) console.log(err);
			// var count = 0;
			// posts.forEach(function(post){
			// 	db.all("SELECT * FROM comments WHERE post_id=?",post.id,function(err,comments){
			// 		if(err) console.log(err);
			// 		count++;
			// 		post.commentsCount = comments.length;
			// 		if(count === posts.length){
			// 			res.render("index.html.ejs",{posts: posts,tags:tags});
			// 		}
			// 	});
			// });
			
			posts.forEach(function(post){
				var curDate = new Date();
				post.postTime = getTimeDiff(post.create_date,curDate);
			});
			res.render("index.html.ejs",{posts: posts,tags:tags});
		});
	})
});

app.get("/posts/sort/:column/:order/:search?",function(req,res){
	var sortColumn = req.params.column;
	var orderBy = req.params.order.toUpperCase();
	var searchContent = req.params.search;
	console.log("SELECT * FROM posts ORDER BY "+sortColumn+" "+orderBy);
	db.all("SELECT * FROM posts ORDER BY "+sortColumn+" "+orderBy,function(err,posts){
		if(err) console.log(err);
		// var count = 0;
		// posts.forEach(function(post){
		// 	db.all("SELECT * FROM comments WHERE post_id=?",post.id,function(err,comments){
		// 		if(err) console.log(err);
		// 		count++;
		// 		post.commentsCount = comments.length;
		// 		if(count === posts.length){
		// 			res.send(posts);
		// 		}
		// 	});
		// });
		if(searchContent){
			posts = posts.filter(function(post){
				var titleSplit = post.title.toLowerCase().split(" ");
				return titleSplit.indexOf(searchContent.toLowerCase()) !== -1;
			});			
		}
		res.send(posts);
	});
});

app.get("/posts/search/:content?",function(req,res){
	var target = req.params.content;
	db.all("SELECT * FROM posts",function(err,posts){
		if(err) console.log(err);
		if(target){
			posts = posts.filter(function(post,index){
				var titleSplit = post.title.toLowerCase().split(" ");
				return titleSplit.indexOf(target.toLowerCase()) !== -1;
			});			
		}
		res.send(posts);
	});
});

app.get("/posts/new",function(req,res){
	res.render("newpost.html.ejs",{post:"", action: "/posts", tags: "", title: "Create New Post"});
});

app.post("/posts",function(req,res){
	var input = req.body;
	var date = new Date();
	input.author = input.author || "anonymous";
		
	db.run("INSERT INTO posts (title,content,author,create_date) VALUES (?,?,?,?)",
	   input.title,input.content,input.author,date.toString(),function(err){
	   		if(err) console.log(err);

	   		// if tags are not available, save post directly,
	   		if(input.tags === ""){
	   			res.redirect("/");
	   		// otherwise save tags and create tagging link
	   		}else{
	   			var curPostId = this.lastID;
				var tags = input.tags.trim().toUpperCase().split(",").map(function(ele){
						return ele.trim();
					});	   		
				// loop thourgh all tags	
	   			tags.forEach(function(tag,index){
	   				var curTagId;
	   				// try to get tag info from tags table,
	   				// if tag exists, do not create new tag
	   				db.get("SELECT * FROM tags WHERE name=?",tag,function(err,target){
	   					if(err) console.log(err);
	   					if(!target){
	   						db.run("INSERT INTO tags (name) VALUES (?)",tag,function(err){
	   							if(err) console.log(err);
	   							curTagId = this.lastID;
	   							db.run("INSERT INTO taggings (post_id,tag_id) VALUES (?,?)",
			   		 				curPostId,curTagId,function(err){
			   		 					if(err) console.log(err);
			   		 					if(index+1 === tags.length){
			   		 						res.redirect("/");
			   		 					}
			   		 				});
	   						});
	   					}else{
	   						curTagId = target.id;
							db.run("INSERT INTO taggings (post_id,tag_id) VALUES (?,?)",
		   		 				curPostId,curTagId,function(err){
		   		 					if(err) console.log(err);
		   		 					if(index+1 === tags.length){
		   		 						res.redirect("/");
		   		 					}	   		 					
		   		 				});   						
	   					}
	   				});
	   			});
	   		}
	   		
	   });
});

app.get("/posts/:id",function(req,res){
	var id = req.params.id;
	db.get("SELECT * FROM posts WHERE id=?",id,function(err,post){
		if(err) console.log(err);
		db.all("SELECT * FROM comments WHERE post_id=?",id,function(err,comments){
			if(err) console.log(err);
			db.all("SELECT * FROM taggings WHERE post_id=?",id,function(err,taggings){
				if(err) console.log(err);
				var postTags = [];
				if(taggings.length === 0){
								res.render("showpost.html.ejs",{post: post,
									comments: comments,
									tags: postTags,
									comment: "",
									action: "/posts/"+id+"/comments/new",
									title: "Leave Comment"});
				}else{
					taggings.forEach(function(tagging,index){
						if(err) console.log(err);
						db.get("SELECT * FROM tags WHERE id=?",tagging.tag_id,function(err,t){
							postTags.push(t);
							//render after last tag read
							if( index+1 == taggings.length){
								res.render("showpost.html.ejs",{post: post,
									comments: comments,
									tags: postTags,
									comment: "",
									action: "/posts/"+id+"/comments/new",
									title: "Leave Comment"});						
							}						
						});
					});					
				}
			});
		});
	});
})

app.get("/posts/:id/edit",function(req,res){
	var id = req.params.id;
	db.get("SELECT * FROM posts WHERE id=?",id,function(err,row){
		if(err) console.log(err);
		res.render("editpost.html.ejs",{post: row,title:"Edit Post", 
			action:"/posts/"+id+"?_method=PUT"});
	});
});

app.put("/posts/:id",function(req,res){
	var id = req.params.id;
	var input = req.body;
	db.run("UPDATE posts SET title=?,content=?,author=? WHERE id=?",
			input.title,input.content,input.author,id,function(err){
				if(err) console.log(err);
				res.redirect("/");
			});
});

app.get("/posts/:id/like",function(req,res){
	var id = req.params.id;
	var vote = 0;
	db.get("SELECT vote FROM posts WHERE id=?",id,function(err,data){
		vote = (+data.vote)+1;
		db.run("UPDATE posts SET vote=? WHERE id=?",vote,id,function(err){
			if(err){
				console.log(err);
			}else{
				res.send(vote+"");
			}
		});
	});
});

app.delete("/posts/:id",function(req,res){
	var id = req.params.id;
	console.log("delete request received.");
	db.run("DELETE FROM posts WHERE id=?",id,function(err){
		if(err) console.log(err);
		res.redirect("/")
	});
})

app.post("/posts/:id/comments/new",function(req,res){
	var id = req.params.id;
	var input = req.body;
	var date = new Date();
	input.author = input.author || "anonymous";
	db.run("INSERT INTO comments (content,author,create_date,post_id) VALUES (?,?,?,?)",
		input.content,input.author,date,id,function(err){
			if(err) console.log(err);
			res.redirect("/posts/"+id);
		});
	db.get("SELECT commentsCount FROM posts WHERE id=?",id,function(err,data){
		if(err) console.log(err);
		console.log(data.commentsCount);
		data.commentsCount++;
		db.run("UPDATE posts SET commentsCount=? WHERE id=?",
			data.commentsCount,id,function(err){
			if(err) console.log(err);
		});
	});
});

app.get("/posts/:id/comments/:comment_id/edit",function(req,res){
	var id = req.params.id;
	var commentid = req.params.comment_id;
	db.get("SELECT * FROM posts WHERE id=?",id,function(err,post){
		if(err){
			console.log(err);
		}else{
			console.log(post);
			db.get("SELECT * FROM comments WHERE id=?",commentid,function(err,comment){
				if(err){
					console.log(err);
				}else{
					res.render("editcomment.html.ejs",{post: post,comment: comment,
						action: "/post/"+id+"/comments/"+commentid+"?_method=PUT",
						title: "Update Comment"});
				}
			});
		}
	});
});

app.put("/post/:id/comments/:comment_id",function(req,res){
	var id = req.params.id;
	var commentid = req.params.comment_id;	
	var input = req.body;
	input.author = input.author || "anonymous";
	db.run("UPDATE comments SET content=?,author=? WHERE id=?",
		input.content,input.author,id,
		function(err){
			if(err) console.log(err);
			res.redirect("/posts/"+id);
		});
});

app.delete("/posts/:id/comments/:comment_id",function(req,res){
	console.log("delete request received");
	var id = req.params.id;
	var commentid = req.params.comment_id;			
	db.run("DELETE FROM comments WHERE id=?",commentid,function(err){
		if(err) console.log(err);
		res.send("delete success");
	});
	db.get("SELECT commentsCount FROM posts WHERE id=?",id,function(err,data){
		data.commentsCount--;
		db.run("UPDATE posts SET commentsCount=? WHERE id=?",
			data.commentsCount,id,function(err){
				if(err) console.log(err);
			});
	});
});

app.get("/tags/:id/posts",function(req,res){
	var id = req.params.id;
	db.all("SELECT * FROM taggings "+
			"INNER JOIN tags ON taggings.tag_id=tags.id "+
			"INNER JOIN posts ON taggings.post_id=posts.id "+
			"WHERE tags.id=?",id,function(err,data){
		res.send(data);
	});
});

app.listen(8888,function(){
	console.log("Forum is running...")
});