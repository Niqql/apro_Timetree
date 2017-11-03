const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

app.engine('.ejs', require('ejs').__express);
app.set('view engine', 'ejs');

const session = require('express-session');
app.use(session({ 
	secret: 'example',
	resave: false,
	saveUninitialized: true
}));

//TingoDB initialisieren
const DB_COLLECTION = "treeDB";
const Db = require('tingodb')().Db;
const db = new Db(__dirname + '/tingodb', {});
const ObjectID = require('tingodb')().ObjectID;

//passwordhash
const passwordHash = require("password-hash");

// Wichtig sonst funktionieren die eingebunden dateien nicht
app.use(express.static(__dirname + "/public"));

app.listen(3000, function(){
	console.log("listening on 3000");
	
	
});

app.get("/" , (request, response) => {
	let authenticated = request.session['authenticated'];
	response.render("index",{"authenticated" : authenticated});
});

app.get("/erstellen" , (request, response) => {
	let authenticated = request.session['authenticated'];
	response.render("create",{"authenticated" : authenticated});
});

app.get("/registrieren" , (request, response) => {
	let authenticated = request.session['authenticated'];
	response.render("register",{"authenticated" : authenticated});
});

app.get("/zeiterfassung" , (request, response) => {
	let authenticated = request.session['authenticated'];
	response.render("tracking",{"authenticated" : authenticated});
});

app.get("/impressum" , (request, response) => {
	response.render("imprint",{"authenticated" : true});
});

app.get("/uebersicht" , (request, response) => {
	let authenticated = request.session['authenticated'];
	response.render("overview",{"authenticated" : authenticated});
});

app.get("/errors" , (request, response) => {
	response.redirect("/")
});

//login, registrierung, logout
let errors = ["Registrierung fehlgeschlagen!", "Login fehlgeschlagen!", "Registrierung fehlgeschlagen, bitte wählen sie einen anderen Benutzernamen.", "Registrierung erfolgreich!"];
let error_id = 0;
let backs = ["/", "/registrieren"];
let back_id = 0;

app.post("/sendregister" , (request, response) =>{	

	//user für login schon vergeben, yo
	const user = request.body.username;
	const password = request.body.passwordset;
	const hashPW = passwordHash.generate(password);
	const document = { 'user' : user, 'password' : hashPW};
	var check = true;	
	
	if(user != "" && password != ""){	
		db.collection(DB_COLLECTION).findOne({"user":user}, (err, result) => {
			console.log(result);
			if(err){console.log(err);}
			if(result != null){
				check = false;			
			}
			if(check){
				db.collection(DB_COLLECTION).save(document, (err, result) => {
					if (err) {
						error_id = 0;
						back_id = 1;
						response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : ""});
					}
					error_id = 3;
					back_id = 1;
					response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : ""});
				});
			}
			else{
				error_id = 2;
				back_id = 1;
				response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : ""});
			}
		});
	}
	else{
		error_id = 0;
		back_id = 1;
		response.render("errors", {"errors" : errors, "id" : error_id, "back" : backs, "bID" : back_id, "authenticated" : ""});
	}
	
});

app.post("/login" , (request, response) =>{
	const user = request.body.user;
	const password = request.body.password;
	var check = true;
	
	if(user != "" | password !=""){
		db.collection(DB_COLLECTION).findOne({"user":user}, (err, result) => {
			console.log(result);
			if(err){console.log(err);}
			if(result == null | result == undefined){
				check = false;			
			}		
			console.log(check);
			if(check){
				if(user == result.user && passwordHash.verify(password, result.password) ){
					request.session[ 'authenticated' ] = true ;
					request.session["user"] = user;
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

app.post("/logout", (request, response) => {
	delete request.session['authenticated'];
	console.log("Erfolgreich ausgeloggt.");
	response.redirect("/");
});
