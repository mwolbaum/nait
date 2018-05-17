const nodemailer = require('nodemailer')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
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
    if (!req.body || !req.body.result || !req.body.result.parameters) {
        return res.status(400).send('Bad Request')
    }

    // the value of Action from api.ai is stored in req.body.result.action
    console.log('* Received action -- %s', req.body.result.action)


    if (req.body.result.action == "webhooktest") {
        var userName = req.body.result.parameters['name'] //retrieves user name from dialogflow
        var webhookReply = WebhookTest(userName)
        
    }
        else if (req.body.result.action == "passwordreset") {
        
        var webhookReply = RequestMSToken()

    }
    else {
        var webhookReply = 'Failed'
    }



    // Response sent back to Dialogflow
    res.status(200).json({
        source: 'webhook',
        speech: webhookReply,
        displayText: webhookReply
    })

})

app.listen(app.get('port'), function () {
    console.log('* Webhook service is listening on port:' + app.get('port'))
})


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

function RequestMSToken() {

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
                client_id: '13b72d96-aee8-4c4e-acad-5d28dbb280ea',
                scope: 'https://graph.microsoft.com/.default',
                client_secret: 'vcujdVOVAE619={xsAX15~(',
                grant_type: 'client_credentials'
            }
    };

    var MSToken = "No Token"

    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        console.log(body);

    });

    MSToken = request.body

    return MSToken
    

}
