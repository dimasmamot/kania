'use strict';

const line = require('@line/bot-sdk');
const express = require('express');
const JSONParseError = require('@line/bot-sdk/exceptions').JSONParseError;
const SignatureValidationFailed = require('@line/bot-sdk/exceptions').SignatureValidationFailed
const mysql = require('mysql');

var con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);
const app = express();

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
  .all(req.body.events.map(handleEvent))
  .then((result) => res.json(result));
});

app.use((err,req,res,next)=>{
  if(err instanceof SignatureValidationFailed){
    res.status(401).send(err.signature);
    return;
  }else if(err instanceof JSONParseError){
    res.status(400).send(err.raw);
    return;
  }
  next(err);
});

con.connect(function(err){
  if(err)
    throw err;
  console.log("Database connected");
});

function handleEvent(event) {
  var msg;
  const message = event.message; //Json field event (id, type, text)
  const source = event.source; //Json field source (type, userId)

  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }  

  if(message.type == 'text'){

    con.query("SELECT * FROM user WHERE line_userid = '"+source.userId+"'", function(err, result, fields){
      if(err)
        throw err;

      var userid;
      var displayName;

      if(result.length == 0){
        client.getProfile(source.userId)
          .then((profile) => {
            userid = profile.userId;
            displayName = profile.displayName;
          }).catch((err) =>{
            throw err;
          });

        var sqlInsert = "INSERT INTO user (line_userid,display_name,nickname,line_id) VALUES ("+userId+","+displayName+","+displayName+","+")";
        con.query(sqlInsert, function(err, result){
        if(err)
          throw err;
          console.log("User inserted");
        });
      }
    });

    if(source.type === 'room'){
      msg = {type: 'text', text: 'Ini dari room revisi?'};
    }else if(source.type === 'group'){
      msg = {type: 'text', text: 'Ini dari grup?'};
    }else{
      msg = {type: 'text',text: message.text};
    } 

    return client.replyMessage(event.replyToken, msg);
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
