//Initial
	//express initialisieren
	const express = require('express');
	const app = express();

	//body parser initialisieren
	const bodyParser = require('body-parser');
	app.use(bodyParser.urlencoded({extended: true}));

	//ejs initialisieren
	app.engine('.ejs', require('ejs').__express);
	app.set('view engine', 'ejs');


	//Session intitialisieren
	const session = require('express-session');
	app.use(session({ 
		secret: 'example',
		resave: false,
		saveUninitialized: true
	}));

	//TingoDB initialisieren
	const DB_COLLECTION = "treeDB";
	const DB_PROJECT_COLLECTION = "projectDB";
	const Db = require('tingodb')().Db;
	const db = new Db(__dirname + '/tingodb', {});
	const ObjectID = require('tingodb')().ObjectID;

	//passwordhash initialisieren
	const passwordHash = require("password-hash");

	// Wichtig sonst funktionieren die eingebunden dateien nicht
	app.use(express.static(__dirname + "/public"));

	app.listen(3000, function(){
		console.log("listening on 3000");	
	});

//get requestst
app.get("/" , (request, response) => {
	let authenticated = request.session.authenticated;
	response.render("index",{"authenticated" : authenticated});
});

app.get("/daten" , (request, response) => {
	let authenticated = request.session.authenticated;
	db.collection(DB_COLLECTION).findOne({'_id': request.session.userID}, (error, result) => {
        if(error) return console.log(error);
		response.render("data",{
			"authenticated" : authenticated,
			"username" : result.user,
            'password': "",
		'errors': []
			});
	});
});

app.get("/erstellen" , (request, response) => {
	let authenticated = request.session.authenticated;
	db.collection(DB_COLLECTION).findOne({'_id': request.session.userID}, (err, result) => {
        if(err) return console.log(err);
		response.render("create",{
			"authenticated" : authenticated,
			"username" : result.user
			});
	});
});

app.get("/registrieren" , (request, response) => {
	let authenticated = request.session.authenticated;
	const username = request.body.username;
	
	response.render("register",{"authenticated" : authenticated, "username" : username});
});

app.get("/zeiterfassung" , (request, response) => {
	db.collection(DB_COLLECTION).findOne({'_id': request.session.userID}, (error, result) => {
        if(error) return console.log(error);
		let authenticated = request.session.authenticated;
		var projectList = [];
		var user = result.user;
		db.collection(DB_PROJECT_COLLECTION).find({}).toArray(function(err, result) {
	    	if (err) return console.log(err);
	    	console.log(result);
	    	for (var i = 0; i < result.length; i++) {
	    		if (result[i].participants.includes(user)) {
	    			projectList.push(result[i].projectName);
	    		}
	    	}
	    	response.render("tracking",{"authenticated" : authenticated, "projectList": projectList});
	 	});
	});
});

app.get("/impressum" , (request, response) => {
	response.render("imprint",{"authenticated" : true});
});

app.get("/uebersicht" , (request, response) => {
	let authenticated = request.session.authenticated;
	var projectList = [];
	db.collection(DB_PROJECT_COLLECTION).find({}).toArray(function(err, result) {
    	if (err) return console.log(err);
    	console.log(result);
    	for (var i = 0; i < result.length; i++) {
    		projectList.push(result[i].projectName);
    	}
    	response.render("overview",{"authenticated" : authenticated, "projectList": projectList, "projectName": "", "projectDescription" : "", "times" : []});
 	});
});

app.get("/errors" , (request, response) => {
	response.redirect("/")
});

//login, registrierung, logout, Projekt erstellung
let errors = [
"Registrierung fehlgeschlagen!", "Login fehlgeschlagen!", "Registrierung fehlgeschlagen, bitte wählen sie einen anderen Benutzernamen.", "Registrierung erfolgreich!", "Projekterstellung fehlgeschlagen!", "Projektname schon vergeben!", "Projekterstellung erfolgreich!", "Zeiterfassung fehlgeschlagen!", "Zeiterfassung erfolgreich!"];
let error_id = 0;
let backs = ["/", "/registrieren","/uebersicht", "/erstellen", "/Zeiterfassung"];
let back_id = 0;

//register handler
app.post("/sendregister" , (request, response) =>{	
	let authenticated = request.session.authenticated;
	//user für login schon vergeben
	const user = request.body.username;
	const password = request.body.passwordset;
	const PWrepeat = request.body.repPasswordset;
	const hashPW = passwordHash.generate(password);
	const document = { 'user' : user, 'password' : hashPW,'projects':[]};
	
	if(user != "" && password != "" && password == PWrepeat){	
		db.collection(DB_COLLECTION).findOne({"user":user}, (err, result) => {
			console.log(result);
			if(err){console.log(err);}
			if(result == null){
				db.collection(DB_COLLECTION).save(document, (err, result) => {
					if (err) {
						error_id = 0;
						back_id = 1;
						response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : authenticated});
					}
					error_id = 3;
					back_id = 0;
					response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : authenticated});
				});
			}
			else{
				error_id = 2;
				back_id = 1;
				response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : authenticated});
			}
		});
	}
	else{
		error_id = 0;
		back_id = 1;
		response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : authenticated});
	}	
});

//login handler
app.post("/login" , (request, response) =>{
	const user = request.body.user;
	const password = request.body.password;
	
	if(user != "" | password !=""){
		db.collection(DB_COLLECTION).findOne({"user":user}, (err, result) => {
			console.log(result);
			if(err){console.log(err);}
			if(result != null | result != undefined){
				if(user == result.user && passwordHash.verify(password, result.password) ){
					request.session.authenticated = true ;
					request.session.userID = result._id;
					response.redirect("/");
				}
				else {
					error_id = 1;
					back_id = 0;
					response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : ""});
				}
			}
			else {
				error_id = 1;
				back_id = 0;
				response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : ""});
			}
		});
	}
	else {
		error_id = 1;
		back_id = 0;
		response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : ""});
	}
});

//logout handler
app.post("/logout", (request, response) => {
	delete request.session['authenticated'];
	console.log("Erfolgreich ausgeloggt.");
	response.redirect("/");
});

//update handler
app.post("/sendupdate", (request, response) => {
    const newName = request.body.username;
    const newPW = request.body.newPasswordset;
    const repeatNewPW = request.body.repPasswordset;
	
    let updateErrors = [];

    if(newName == "" || newPW == "" || repeatNewPW == ""){updateErrors.push('Please fill in all the Data!');}
    if(newPW != repeatNewPW){updateErrors.push('Passwords dont match');}
    
    if(updateErrors.length > 0)
    {
        response.render('data', {
            'user': newName,
            'password': newPW,
            'errors': updateErrors
        });

        return;
    }
	
	const hashPW = passwordHash.generate(newPW);
    const newUser = {'user': newName, 'password': hashPW};

    db.collection(DB_COLLECTION).update({'_id': request.session.userID}, newUser , (error, result) => {
        response.redirect('/');
    });
});

//create project handler
app.post("/createproject", (request, response) => {
	let authenticated = request.session.authenticated;
    const projectName = request.body.projectname;
    const participant = request.body.participant;
	const participants = participant.split(",");
	//console.log(1);	
    const description = request.body.description;
    const document = { 'projectName' : projectName, 'participants' : participants, 'description' : description, 'time' : []};
	
	if(projectName != "" && participant!= ""){	
		db.collection(DB_PROJECT_COLLECTION).findOne({"projectName":projectName}, (err, result) => {
			//console.log(2);
			if(err){console.log(err);}
			if(result == null){
				//console.log(3);
				db.collection(DB_PROJECT_COLLECTION).save(document, (err, result) => {
					if (err) {
						//Fehler beim erstellen vom Projekt
						error_id = 4;
						back_id = 3;
						response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : authenticated});
					}
					//Projekt erfolgreich erstellt, Projekt wird in participants eingetragen

				//console.log(4);
					for(var i = 0 ; i<participants.length; i++){
						db.collection(DB_COLLECTION).findOne({"user":participants[i]}, (err, result) => {
							//console.log(5);
							if(err){console.log(err);}
							if(result != null | result != undefined){
								var newProjects = result.projects;
								newProjects.push(projectName);
								result.projects = newProjects;
								db.collection(DB_COLLECTION).update({'_id': result._id}, result, (error, result) => {
									//response.redirect('/');
								});
								//console.log(6);
							}
						});
					}
					//console.log(7);
					error_id = 6;
					back_id = 2;
					response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : authenticated});
				});
			}
			else{
				//Projekt schon vorhanden
				error_id = 5;
				back_id = 3;
				response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : authenticated});
			}
		});
	}
	else{
		//Projektdaten falsch eingegegeben
		error_id = 4;
		back_id = 3;
		response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : authenticated});
	}
	
});

//create project handler
app.post("/trackproject", (request, response) => {
	let authenticated = request.session.authenticated;
	db.collection(DB_COLLECTION).findOne({'_id': request.session.userID}, (error, result) => {
        if(error) return console.log(error);
	    const date = request.body.date;
	    const time = request.body.time;
	    const comment = request.body.comment;
	    const projectName = request.body.project;
	    const document = { 'date' : date, 'time' : time, 'comment' : comment, 'user': result.user};
		
		if(date != "" && time != "" && projectName != ""){	
			db.collection(DB_PROJECT_COLLECTION).findOne({"projectName":projectName}, (err, result) => {
				console.log(result);
				if(err){console.log(err);}
				if(result != null){
					result.time.push(document);
					db.collection(DB_PROJECT_COLLECTION).update({'projectName': projectName}, result, (error, result) => {
						if (err) {
							error_id = 7;
							back_id = 4;
							response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : authenticated});
						}
						error_id = 8;
						back_id = 2;
						response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : authenticated});
					});
				}
				else{
					error_id = 7;
					back_id = 4;
					response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : authenticated});
				}
			});
		}
		else{
			error_id = 7;
			back_id = 4;
			response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : authenticated});
		}
	});
});

//select overview project
app.post("/overviewSelectProject", (request, response) => {
	let authenticated = request.session.authenticated;
	const project = request.body.project;
	var projectList = [];
	var times = [];
	var projectDescription;
	db.collection(DB_PROJECT_COLLECTION).find({}).toArray(function(err, result) {
    	if (err) return console.log(err);
    	console.log(result);
    	for (var i = 0; i < result.length; i++) {
    		projectList.push(result[i].projectName);
    	}
    	for (var i = 0; i < result.length; i++) {
    		if (result[i].projectName == project) {
    			times = result[i].time;
    			projectDescription = result[i].description;
    		}
    	}
    	console.log("1" + project);
    	response.render("overview",{"authenticated" : authenticated, "projectList": projectList, "projectName" : project, "projectDescription" : projectDescription, "times" : times });
 	});
});
