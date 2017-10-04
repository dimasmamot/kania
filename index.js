'use strict';

const line = require('@line/bot-sdk');
const express = require('express');
const JSONParseError = require('@line/bot-sdk/exceptions').JSONParseError;
const SignatureValidationFailed = require('@line/bot-sdk/exceptions').SignatureValidationFailed
const mysql = require('mysql');

var db_config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
};

var con;

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

handleDisconnect();

function handleEvent(event) {
  var msg;
  const message = event.message; //Json field event (id, type, text)
  const source = event.source; //Json field source (type, userId)

  if (event.type !== 'message') {
    console.log("Bukan request message");
    return Promise.resolve(null);
  }  

  if(message.type == 'text'){

    con.query("SELECT * FROM user WHERE line_userid = '"+source.userId+"'", function(err, result, fields){
      if(err)
        throw err;

      if(result.length == 0){
        client.getProfile(source.userId)
        .then((profile) => {
          var userid = profile.userId;
          var displayName = profile.displayName;
          var sqlInsert = "INSERT INTO user (line_userid,display_name,nickname) VALUES ('"+userid+"','"+displayName+"','"+displayName+"')";
          con.query(sqlInsert, function(err, result){
            if(err)
              throw err;
            console.log("User inserted");
          });
        }).catch((err) =>{
          throw err;
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
  }else if(message.type == 'location'){
    var placeQuery = {
      location: [message.latitude, message.longitude],
      radius: 1000,
      rankby: "distance",
      language: "id",
      keyword: "tempat makan",
      type: "restaurant"
    }

    var googleMapsClient = require('@google/maps').createClient({
      key: process.env.API_KEY
    });

    gMapClient.placesNearby(placeQuery, function(err, response){
      if(err)
        console.log("Error query tempat : ",err);
      console.log(response.json.results);
    });

    // gMapClient.geocode({
    //   address: '1600 Amphitheatre Parkway, Mountain View, CA'
    // }, function(err,response){
    //   if(err){
    //     throw err
    //   }else{
    //     console.log(response.json.results);
    //   }
    // });
  }
}

function handleDisconnect(){
  con = mysql.createConnection(db_config);

  con.connect(function(err){
    if(err){
      console.log('Error connect dataase : ', err);
      setTimeout(handleDisconnect, 2000);
    }else{
      console.log('Database connection succeed');
    }
  });

  con.on('error', function(err){
    console.log('database error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST'){
      handleDisconnect();
    }else{
      throw err;
    }
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
