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

app.listen(3000, function(){
	console.log("listening on 3000");
});