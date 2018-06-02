const nodemailer = require('nodemailer')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
var isString = require('is-string')
app.use(bodyParser.json())
app.set('port', (process.env.PORT || 5000))

//const REQUIRE_AUTH = false
//const AUTH_TOKEN = 'an-example-token'

app.get('/', function (req, res) {
    res.send('Use the /webhook endpoint.')
})
app.get('/webhook', function (req, res) {
    res.send('You must POST your request')
})

app.post('/webhook', function (req, res) {
    // we expect to receive JSON data from api.ai here.
    // the payload is stored on req.body
    console.log(req.body)

    // we have a simple authentication
    // if (REQUIRE_AUTH) {
    //  if (req.headers['auth-token'] !== AUTH_TOKEN) {
    //     return res.status(401).send('Unauthorized')
    //   }
    // }

    // and some validation too

    var webhookReply = "not ready"
    if (!req.body || !req.body.result || !req.body.result.parameters) {
        return res.status(400).send('Bad Request')
    }

    // the value of Action from api.ai is stored in req.body.result.action
    console.log('* Received action -- %s', req.body.result.action)


    if (req.body.result.action == "webhooktest") {
        var userName = req.body.result.parameters['name'] //retrieves user name from dialogflow
        webhookReply = WebhookTest(userName)

        res.status(200).json({
            source: 'webhook',
            speech: webhookReply,
            displayText: webhookReply
        })

    }
    else if (req.body.result.action == "passwordreset") {

        //var webhookReply = RequestMSToken()

        //var username = req.body.result.parameters['name'] //retrieves user name from dialogflow
        //var phonenum = req.body.result.parameters['phone'] //retrieves phone number from dialogflow (not yet implemented)

        var fname = req.body.result.parameters['firstname'] //retrieves user name from dialogflow
        var lname = req.body.result.parameters['lastname'] //retrieves user name from dialogflow

        var username = fname.substring(0, 1) + lname

        RequestMSToken(function (response) {

            var jsonobj = JSON.parse(response);
           // console.log("Token is: " + jsonobj.access_token);
            // MSListUsers(jsonobj.access_token)

            MSGetUser(jsonobj.access_token, username, function (user) {

                userobject = JSON.parse(user);
                console.log('Display Name: ' + user.displayName)


            


            MSResetPassword(jsonobj.access_token, username, function (newpass) {

               // var isJSON = require('is-json');

                //console.log('result JSON? ' + isJSON(newpass)); // true

                if (isString(newpass)) //if no error
                {
                    webhookReply = 'Your new password is ' + newpass
                }
                else //If no string returned then it is a JSON object with error message
                {
                   //THIS ERROR OCCURS IF username DOES NOT EXIST IN ACTIVE DIRECTORY
                    // NEED TO SUPPLY BETTER ERROR MESSAGE
                   // GIVE THE USER THE OPTION TO TYPE USER NAME RATHER THAN SPEAK

                    webhookReply = 'Sorry there was an error\n\n' + JSON.stringify(newpass.error.message)
                
                }

                console.log(webhookReply)
                

                res.status(200).json({
                    source: 'webhook',
                    speech: webhookReply,
                    displayText: webhookReply
                })



            })

        })
        });

    }

    else if (req.body.result.action == "adcreateuser") {

        var fname = req.body.result.parameters['firstname'] //retrieves user name from dialogflow
        var lname = req.body.result.parameters['lastname'] //retrieves user name from dialogflow

       // var phonenum = req.body.result.parameters['phone'] //retrieves phone number from dialogflow (not yet implemented)

       RequestMSToken(function (response) {

        var jsonobj = JSON.parse(response);

        MSCreateUser(jsonobj.access_token, fname, lname, function (ADResponse) {

         
                webhookReply = 'Created new user ' + JSON.stringify(ADResponse.userPrincipalName)

            console.log(webhookReply)


            //NEED TO DO ERROR HANDLING
            //WHAT IF USERNAME ALREADY EXISTS?
            

            res.status(200).json({
                source: 'webhook',
                speech: webhookReply,
                displayText: webhookReply
            })



        })
    });






    }

    else {
        webhookReply = 'Failed'

        // Response sent back to Dialogflow
        res.status(200).json({
            source: 'webhook',
            speech: webhookReply,
            displayText: webhookReply
        })
    }



    // Response sent back to Dialogflow
    // res.status(200).json({
    //  source: 'webhook',
    // speech: webhookReply,
    // displayText: webhookReply
    //})

})

app.listen(app.get('port'), function () {
    console.log('* Webhook service is listening on port:' + app.get('port'))
})



//THIS FUNCTION IS OLD. INITIAL TESTING OF SENDING EMAILS. SEEMED TO WORK PRETTY GOOD EXCEPT GMAIL WOULD OFTEN
//REFUSE TO SEND THE EMAIL BECAUSE IT THINKS THIS APP IS UNTRUSTED
//NEED TO CHANGE TO PROPER AUTHENTICATION (OAUTH?) FOR GMAIL TO TRUST
function WebhookTest(userName) {
    // parameters are stored in req.body.result.parameters

    var email = ""

    //This section should instead retrieve emails from a database
    switch (userName) {
        case "Matt":
            email = "mrwolbaum@gmail.com"
            break;
        case "Anh":
            email = "anhn9393@gmail.com"
            break;
        case "Adrian":
            email = "comiseladrian@gmail.com"
            break;
        case "Ayesha":
            email = "ayesha.srana@gmail.com"
            break;

        default:
            email = ""
            break;
    }

    if (email != "") {
        var wReply = 'Hello ' + userName + ', I am sending a password reset link to your email: ' + email + '.'
        SendEmail(email, userName);
    }
    else {
        var wReply = 'Sorry ' + userName + ' I do not recognize your name.'
    }

    return wReply
}


function SendEmail(email, userName) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'naitassistant@gmail.com',
            pass: process.env.GMAIL_PASSWORD //Heroku config var
        }
    });

    var mailOptions = {
        from: 'naitassistant@gmail.com',
        to: email, //replace will email from user query
        subject: 'Password Reset',
        text: 'Hi ' + userName + ',\nPlease click this link to reset your password'
    };


    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}


function RequestMSToken(callback) {

    var request = require("request");

    var options = {
        method: 'POST',
        url: 'https://login.microsoftonline.com/aaamnait.onmicrosoft.com/oauth2/v2.0/token',
        headers:
            {
                'Cache-Control': 'no-cache',
                'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
            },
        formData:
            {
                client_id: process.env.CLIENT_ID, //Heroku config var
                scope: 'https://graph.microsoft.com/.default',
                client_secret: process.env.CLIENT_SECRET,   //Heroku config var
                grant_type: 'client_credentials'
            }
    };

    //var MSToken = "No Token"

    // function GetBody(options, callback) {
    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        console.log(body);
        return callback(body);


    });
    //}

    // MSToken = request.body

    //console.log('MSToke: ' + MSToken)

    //var MSToken = "blank"




    // GetBody(options, function (response) {

    //   console.log("body is: " + body);
    //    msToken = body
    // });

    //return "test" //MSToken 


}


//NOT CURRENTLY USED. FOR TESTING
function MSListUsers(token) {


    var request = require("request");

    var options = {
        method: 'GET',
        url: 'https://graph.microsoft.com/v1.0/users/',
        headers:
            {
                'Cache-Control': 'no-cache',
                Authorization: 'Bearer ' + token
            }
    };

    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        console.log(body);

    });



}

function MSResetPassword(token, username, callback) {

    var request = require("request")
    var randomize = require('generate-password');

    var randpass = randomize.generate({
        length: 10,
        numbers: true,
        strict: true
    });

    console.log('Random Password = ' + randpass);

    var options = {
        method: 'PATCH',
        url: 'https://graph.microsoft.com/v1.0/users/' + username + '@aaamnait.onmicrosoft.com',
        headers:
            {
                'Cache-Control': 'no-cache',
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
        body: { passwordProfile: { forceChangePasswordNextSignIn: false, password: randpass } },
        json: true
    };

    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        //var jsonobj = JSON.parse(body);
        if(body)
        {
            console.log(body);
            return callback(body)

        }

        else
        {
            console.log(body);
            return callback(randpass); //need to return password if successful and error if fail
        }
        

        
    });


}

function MSGetUser(token, username, callback) {

    var request = require("request")
    

    var options = {
        method: 'GET',
        url: 'https://graph.microsoft.com/v1.0/users/' + username + '@aaamnait.onmicrosoft.com',
        headers:
            {
                'Cache-Control': 'no-cache',
                Authorization: 'Bearer ' + token,
            } };


 
    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        //var jsonobj = JSON.parse(body);

            console.log('User info:\n ' + body);
            return callback(body)
        
    });


}


function MSCreateUser (token, fname, lname, callback)

{

    var request = require("request");

    var randomize = require('generate-password');

    var randpass = randomize.generate({
        length: 10,
        numbers: true,
        strict: true
    });

    var username = fname.substring(0, 1) + lname

    
    var options = { method: 'POST',
      url: 'https://graph.microsoft.com/v1.0/users',
      headers: 
       { 'Cache-Control': 'no-cache',
         Authorization: 'Bearer ' + token,
         'Content-Type': 'application/json' },
      body: 
       { accountEnabled: true,
         displayName: fname + ' ' + lname,
         mailNickname: username,
         userPrincipalName: username + '@aaamnait.onmicrosoft.com',
         passwordProfile: { forceChangePasswordNextSignIn: true, password: randpass } },
      json: true };
    
    request(options, function (error, response, body) {
      if (error) throw new Error(error);
    
      console.log(body);
      return callback(body);
    });
    



}
