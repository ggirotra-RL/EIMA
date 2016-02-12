
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var jwt = require('jwt-simple');
var _ = require('underscore');
var mysql = require('mysql');

var app = express();

/*Defining Database connection such as user name, password and database.*/
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'admin',
  database : 'visastatus'
});

connection.connect(function(){
    console.log("<== MySQL Database is Connected ==>");
});

// all environments
app.set('port', process.env.PORT || 3000);
app.set('jwtTokenSecret', '123456ABCDEF');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

var tokens = [];

function requiresAuthentication(request, response, next) {
    console.log(request.headers);
    if (request.headers.access_token) {
        var token = request.headers.access_token;
        if (_.where(tokens, token).length > 0) {
            var decodedToken = jwt.decode(token, app.get('jwtTokenSecret'));
            if (new Date(decodedToken.expires) > new Date()) {
                next();
                return;
            } else {
                removeFromTokens();
                response.end(401, "Your session is expired");
            }
        }
    }
    response.end(401, "No access token found in the request");
}

function removeFromTokens(token) {
    for (var counter = 0; counter < tokens.length; counter++) {
        if (tokens[counter] === token) {
            tokens.splice(counter, 1);
            break;
        }
    }
}

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(request, response) {
    response.sendfile("Home.html");
});

app.get('/api/load', function(request, response){
    console.log("<== We are going to load data from Table ==>");
    connection.query("select * from visastatus.employee_detail", function(err, rows, fields){
        if(err) throw err;      
        console.log("<== Data is been loaded. ==>");
        response.end(JSON.stringify(rows));  
        console.log("<== Data is been sent to Client. ==>");                
    });

});

app.post('/api/addNew', function(request, response) {
    var userName = request.body.fname;
    var contact = request.body.contact;
    var email = request.body.email;
    var passport = request.body.passport;
    var passportExpires = request.body.passportExpires;
    var visaType = request.body.visaType;
    var visaExpires = request.body.visaExpires;
    var I94Expires = request.body.I94Expires;
    var petitionExpires = request.body.petitionExpires;
    
    var post  = {name: userName, contact: contact, email: email, passport: passport};
    var query = connection.query('INSERT INTO visastatus.employee_detail SET ?', post, function(err, rows, result) {
       if(err) throw err;      
            console.log("<== Data is been loaded. ==>");
            response.end(JSON.stringify(rows));  
            console.log("<== Data is been sent to Client. ==>"); 
    });

/*    connection.query('Insert into visastatus.employee_detail 
        (name,contact,email,passport,passportExpires,visaType,visaExpires,I94Expires,petitionExpires) 
        values('+userName+', '+contact+','+email+','+passport+','+passportExpires+',
        '+visaType+','+visaExpires+','+I94Expires+','+petitionExpires+')', 
        function(err, rows, fields){
            if(err) throw err;      
            console.log("<== Data is been loaded. ==>");
            response.end(JSON.stringify(rows));  
            console.log("<== Data is been sent to Client. ==>");                
        });*/

});


app.post('/api/login', function(request, response) {
    var userName = request.body.userName;
    var password = request.body.password;

    if (userName === "admin" && password === "123") {
        var expires = new Date();
        expires.setDate((new Date()).getDate() + 5);
        var token = jwt.encode({
            userName: userName,
            expires: expires
        }, app.get('jwtTokenSecret'));

        tokens.push(token);

        response.send(200, { access_token: token, userName: userName });
    } else {
        response.send(401, "Invalid credentials");
    }
});

app.post('/api/logout', requiresAuthentication, function(request, response) {
    var token = request.headers.access_token;
    removeFromTokens(token);
    response.send(200);
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
