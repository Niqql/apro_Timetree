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

	app.listen(3000, function(){console.log("listening on 3000");});

//get requestst
app.get("/" , (request, response) => {
	let authenticated = request.session.authenticated;
	let weekSoll = "20:00";
	let weekIs;
	let weekDif;
	if(authenticated){
		db.collection(DB_COLLECTION).findOne({'_id': request.session.userID}, (error, result) => {
			if(error) return console.log(error);
			var projectTimes = [];
			var user = result.user;
			weekIs = result.time;
			var soll = weekSoll.split(":");
			var is = weekIs.split(":");
			var dif = (parseInt(soll[0])*60 + parseInt(soll[1]))-(parseInt(is[0])*60 + parseInt(is[1]));
			weekDif = (dif-(dif%60))/60 + ":" + dif%60;
			db.collection(DB_PROJECT_COLLECTION).find({}).toArray(function(err, result) {
				if (err) return console.log(err);
				console.log(result);
				for (var i = 0; i < result.length; i++) {
					if (result[i].participants.includes(user)) {
						for (var j = 0; j < result[i].time.length; j++) {
							if (result[i].time[j].user == user) {
								var temp = result[i].time[j];
								temp.user = result[i].projectName;
								projectTimes.push(temp);
							}
						}
					}
				}
				response.render("index",{"authenticated" : authenticated, "projectTimes" : projectTimes , "weekSoll" : weekSoll, "weekIs": weekIs, "weekDif": weekDif});
			});
		});
	}
	else{
		response.render("index",{"authenticated" : authenticated, "projectTimes" : [] , "weekSoll" : "", "weekIs": "", "weekDif": ""});
	}
});

app.get("/daten" , (request, response) => {
	let authenticated = request.session.authenticated;
	if(authenticated){
		db.collection(DB_COLLECTION).findOne({'_id': request.session.userID}, (error, result) => {
			if(error) return console.log(error);
			response.render("data",{
				"authenticated" : authenticated,
				"username" : result.user,
				'password': "",
			'errors': []
				});
		});
	}
	else{
		response.render("data",{
				"authenticated" : authenticated,
				"username" : "",
				'password': "",
			'errors': []
				});
	}
});

app.get("/erstellen" , (request, response) => {
	let authenticated = request.session.authenticated;
	if(authenticated){
		db.collection(DB_COLLECTION).findOne({'_id': request.session.userID}, (err, result) => {
			if(err) return console.log(err);
			response.render("create",{
				"authenticated" : authenticated,
				"username" : result.user
			});
		});
	}
	else{
		response.render("create",{"authenticated" : authenticated,"username" : ""});
	}
});

app.get("/registrieren" , (request, response) => {
	let authenticated = request.session.authenticated;
	const username = request.body.username;
	
	response.render("register",{"authenticated" : authenticated, "username" : username});
});

app.get("/zeiterfassung" , (request, response) => {
	let authenticated = request.session.authenticated;
	if(authenticated){
		db.collection(DB_COLLECTION).findOne({'_id': request.session.userID}, (error, result) => {
			if(error) return console.log(error);		
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
	}
	else{
		response.render("tracking",{"authenticated" : authenticated, "projectList": []});
	}
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
"Registrierung fehlgeschlagen!", "Login fehlgeschlagen!", "Registrierung fehlgeschlagen, bitte wählen sie einen anderen Benutzernamen.", "Registrierung erfolgreich!", 
"Projekterstellung fehlgeschlagen!", "Projektname schon vergeben!", "Projekterstellung erfolgreich!", 
"Zeiterfassung fehlgeschlagen!", "Zeiterfassung erfolgreich!"];
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
	const document = { 'user' : user, 'password' : hashPW, 'time': "00:00"};
	
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
	let authenticated = request.session.authenticated;
    let updateErrors = [];

    if(newName == "" || newPW == "" || repeatNewPW == ""){updateErrors.push('Bitte alle Daten eingeben!');}
    if(newPW != repeatNewPW){updateErrors.push('Passwörter stimmen nicht über ein!');}
    
    if(updateErrors.length > 0)
    {
        response.render('data', {
            'username': newName,
            'password': newPW,
            'errors': updateErrors,
			'authenticated': authenticated
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

//track project handler
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

//track weektime handler
app.post("/generaltrack", (request, response) => {
	let authenticated = request.session.authenticated;
	db.collection(DB_COLLECTION).findOne({'_id': request.session.userID}, (error, result) => {
        if(error) return console.log(error);
        var arrival = request.body.arrival.split(":");
        var departure = request.body.departure.split(":");
	    var oldTime = result.time.split(":");
	    newTime = [0,0];
	    arrival[0] = parseInt(arrival[0]);
	    departure[0] = parseInt(departure[0]);
	    oldTime[0] = parseInt(oldTime[0]);
	    arrival[1] = parseInt(arrival[1]);
	    departure[1] = parseInt(departure[1]);
	    oldTime[1] = parseInt(oldTime[1]);
	    newTime[1] = oldTime[1] + departure[1] - arrival[1];
	    if (newTime[1] >= 60) {
	    	newTime[1] = newTime[1] - 60;
	    	newTime[0] = oldTime[0] + departure[0] - arrival[0] + 1;
	    } else {
	    	newTime[0] = oldTime[0] + departure[0] - arrival[0];
	    }
	    var outp = newTime[0].toString() + ":" + newTime[1].toString();
	    result.time =outp;
	    db.collection(DB_COLLECTION).update({'_id': request.session.userID}, result, (error, result) => {
			if (error) {
				error_id = 7;
				back_id = 4;
				response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : authenticated});
			}
			error_id = 8;
			back_id = 0;
			response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : authenticated});
		});
	});
});