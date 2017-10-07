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
  var replyToken = event.replyToken;

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

    if(message.text == 'photo'){
      console.log("event njaluk foto fired");
      var photoQuery = {
        maxwidth: 400,
        photoreference: "CnRtAAAATLZNl354RwP_9UKbQ_5Psy40texXePv4oAlgP4qNEkdIrkyse7rPXYGd9D_Uj1rVsQdWT4oRz4QrYAJNpFX7rzqqMlZw2h2E2y5IKMUZ7ouD_SlcHxYq1yL4KbKUv3qtWgTK0A6QbGh87GB3sscrHRIQiG2RrmU_jF4tENr9wGS_YxoUSSDrYjWmrNfeEHSGSc3FyhNLlBU"
      };
      var googleMapsClient = require('@google/maps').createClient({
        key: process.env.API_KEY
      });

      googleMapsClient.placesPhoto(photoQuery, function(err, response){
        if(err)
          console.log("Error query place photo : ", err);

        // console.log(response.req.socket._host);
        console.log(response.req.socket._host + "" + response.req.path);
      });
    }  

    return client.replyMessage(event.replyToken, msg);
  }else if(message.type == 'location'){
    console.log("tempat dikirim");
    var placeQuery = {
      location: [message.latitude, message.longitude],
      radius: 1000,
      language: "id",
      keyword: "tempat makan",
      type: "restaurant"
    }

    var googleMapsClient = require('@google/maps').createClient({
      key: process.env.API_KEY
    });

    var tmpMsg;

    googleMapsClient.placesNearby(placeQuery, function(err, response){
      if(err)
        console.log("Error query tempat : ",err);

      // console.log("Query tempat berhasil");
      // console.log(response.json.results);

      var result = response.json.results;

      var tmpMsg = {
        "type": "template",
        "altText": "Makan disini aja",
        "template": {
          "type": "carousel",
          "columns": []
        }
      }

      // console.log(tmpMsg);
      // console.log(response.req.socket._host);
      // console.log(response.req.path);
      var resultLength = result.length;
      
      if (resultLength > 5)
        resultLength = 5;
      else if(resultLength = 0){
        var msg = {type: 'text', text: 'Aku ngga bisa nemuin tempat makan dengan radius 1KM dari tempat kamu nih, coba jalan aja dulu'};
        return client.replyMessage(event.replyToken, msg);
      }
      for (var i = 0; i < 5; i++) {
        // console.log("photoreference["+i+"]:"+result[i].photos[0].photo_reference);
        // console.log("vicinity["+i+"]:"+result[i].vicinity);
      }

      console.log("Hasilnya ada : "+resultLength);
      console.log("Hasilnya : ");
      // console.log(result);
      for(var i=0; i<resultLength ;i++){

        // console.log("event request photo "+i);
        // console.log("Photo reference "+i+" adalah ");
        // console.log(result[i].photos[0].photo_reference);
        try{
          var photoQuery = {
            maxwidth: 400,
            photoreference: result[i].photos[0].photo_reference,          
          };
        }catch(err){
          console.log("Ternyata di sini errornya",err);
        }
        var myFunction = function(i){
          googleMapsClient.placesPhoto(photoQuery, function(err, response){
            // console.log("host: "+response.req.socket._host + "" + response.req.path);
            if(err)
              console.log("Error query place photo : ", err);
            var tmpObj = {
              "thumbnailImageUrl": "https://" + response.req.socket._host + "" + response.req.path,
              "title": result[i].name,
              "text": result[i].vicinity,
              "actions": [{
                "type": "postback",
                "label": "Aksi Kosong",
                "data": "action=buy&itemid=111"
              },
              {
                "type": "postback",
                "label": "Aksi Kosong",
                "data": "action=add&itemid=111"
              },
              {
                "type": "uri",
                "label": "Liat Map",
                "uri": "http://example.com/page/111"
              }]
            };
            console.log("Objek : "+i);
            console.log(tmpObj);
            tmpMsg.template.columns.push(tmpObj);
            // console.log("sudah ke push "+i);
            // console.log(tmpMsg);
            // console.log(photoQuery);
            if(tmpMsg.template.columns.length == resultLength){
              console.log("Selesai");
              console.log(tmpMsg.template.columns.length);
              console.log(tmpMsg);
              client.replyMessage(event.replyToken, tmpMsg).catch((err) =>{
                console.log("Reply error", err);
              });
            }
          });
        }
        // console.log("photo reference" +i+ ":" +result[i].photos[0].photo_reference);
          console.log("array object ke : " + i);
        try{
          console.log(result[i].photos);
        }catch(err){
          console.log("Error parsing coy",err);
        }
        // myFunction(i); 
      }
    });
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
