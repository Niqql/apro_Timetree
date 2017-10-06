// Initialisierung des Webservers
const express = require('express');
const app = express();

// body-parser initialisieren
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

// EJS Template Engine initialisieren
app.engine('.ejs', require('ejs').__express);
app.set('view engine', 'ejs');

// Sessions initialisieren
const session = require('express-session');
app.use(session({ 
	secret: 'example',
	resave: false,
	saveUninitialized: true
}));


// Webserver starten
// Aufruf im Browser: http://localhost:3000

app.listen(3000, function(){
	console.log("listening on 3000");
});

app.get('/login', function(req,res){
	res.render('login');
});

app.get('/', function(req,res){
	res.render('index', {'message': 'Bitte zuerst anmelden'});
});

app.post('/onLogin', function(req,res){
	const username = req.body['username'];
	const password = req.body['password'];
	
	if(username == 'studi' && password == 'geheim'){
		console.log('Anmeldung erfolgreich');
		req.session['autheticated'] = true;
		req.session['user'] = username;
		res.redirect('/content');
	} else {
		res.render('index', {'message' : 'Anmeldung fehlgeschalgen'});
	}
});

app.get('/content', function(req,res){
	if(req.session['autheticated'] == true){
		res.render('content', {'user': req.session['user']});
	}else{
		res.redirect('/');
	}
});

app.get('/logout', function(req,res){
	delete req.session['authenticated'];
	res.redirect('/');
});