// modules
var express = require("express");
var app = express();
var sqlite3 = require("sqlite3");
var db = new sqlite3.Database("data.db");
var ejs = require("ejs");
var path = require("path");
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var dbConfig = require('./mongoDB.js');
var mongoose = require('mongoose');
var bodyParser = require("body-parser");
var methodOverride = require("method-override");
var fs = require("fs");
var marked = require("marked");
var getTimeDiff = require("./countTimeDiff.js")

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false
});


//connect database for user info
mongoose.connect(dbConfig.url);

// middleware
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extend:false}));
app.use(methodOverride("_method"));
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));
app.set("view_engine","ejs");


var passport = require('passport');
var expressSession = require('express-session');

app.use(expressSession({secret: 'mySecretKey'}));
app.use(passport.initialize());
app.use(passport.session());

// Using the flash middleware provided by connect-flash to store messages in session
 // and displaying in templates
var flash = require('connect-flash');
app.use(flash());

// Initialize Passport
var initPassport = require('./passport/init');
initPassport(passport);

// var isLoggedIn = function(req,res,next){
// 	if(req.isAuthenticated()){
// 		next();
// 	}else{
// 		res.redirect("/");
// 	}
// };

// var isLoggedIn = function(req,res,next){
// 	return req.isAuthenticated();
// };

app.get("/",function(req,res){
	var isLoggedIn = req.isAuthenticated();
	// console.log(req.user);

	db.all("SELECT * FROM posts ORDER BY id DESC",function(err,posts){
		if(err) console.log(err);		
		db.all("SELECT * FROM tags",function(err,tags){			
			posts.forEach(function(post){
				var curDate = new Date();
				post.postTime = getTimeDiff(post.create_date,curDate);
			});
			res.render("index.html.ejs",{posts: posts,
				tags:tags,
				isLoggedIn: isLoggedIn,
				user: req.user,
				message: req.flash("message")});
		});
	})
});

app.post("/login",passport.authenticate("login",{
	successRedirect: '/',
	failureRedirect: '/',
	failureFlash : true 
}));

app.get("/signup",function(req,res){
	res.render("signup.html.ejs",{message: req.flash("message")});
});

app.post("/signup",passport.authenticate("signup",{
	successRedirect: '/',
	failureRedirect: '/signup',
	failureFlash : true 	
}))

app.get("/signout",function(req,res){
	req.logout();
	res.redirect("/");
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
	db.all("SELECT * FROM posts ORDER BY id DESC",function(err,posts){
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
	console.log(req.user)
	var post = {
		"title"   : "",
		"author"  : req.user.firstname,
		"content" : ""
	};
	res.render("newpost.html.ejs",{post: post, action: "/posts", tags: "", title: "Create New Post"});
});

app.post("/posts",function(req,res){
	var input = req.body;
	var date = new Date();
	input.author = input.author || "anonymous";
		
	db.run("INSERT INTO posts (title,content,author,create_date,email) VALUES (?,?,?,?,?)",
	   input.title,input.content,input.author,date.toString(),req.user.email,function(err){
	   		if(err) console.log(err);
	   		var curPostId = this.lastID;

	   		//add tag "ALL" to the new post
	   		db.run("INSERT INTO taggings (post_id,tag_id) VALUES (?,?)",curPostId,1,function(err){
	   			if(err) console.log(err);
	   		});

	   		// if other tags are not available, done, go back to main page
	   		if(input.tags === ""){
	   			res.redirect("/");
	   		// otherwise save tags and create tagging link
	   		}else{
	   			
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
    var user = req.user;
    var isLoggedIn = req.isAuthenticated();

	db.all("SELECT * FROM comments WHERE post_id=?",id,function(err,comments){
		if(err) console.log(err);
		db.all( "SELECT * FROM taggings "+
				"INNER JOIN tags ON taggings.tag_id=tags.id "+
				"INNER JOIN posts ON taggings.post_id=posts.id "+
				"WHERE posts.id=?",id,function(err,data){
					fs.writeFileSync(__dirname+"/views/_markedContent.ejs",marked(data[0].content));
					res.render("showpost.html.ejs",{post: data[0],
						comments: comments,
						tags: data,
						comment: "",
						action: "/posts/"+id+"/comments/new",
						title: "Leave Comment",
						user: user,
						isLoggedIn:isLoggedIn});					
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
			if(err) console.log(err);
			res.send(vote+"");	
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