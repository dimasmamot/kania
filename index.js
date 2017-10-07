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

    if(message.text.toLowerCase() == "howto"){
      msg = {type: 'text', text: 'Kalau kamu mau cari tempat makan, langsung aja share location kamu ke aku'};
    }else if(message.text.toLowerCase() == "help"){
      msg = {type: 'text', text: 'Kania masih tahap beta, jadi command-nya cuman ada tiga, "help", "howto", "tentang kania", dan buat yang mau intip source code kania bisa pake command "techdev" :D'};
    }else if(message.text.toLowerCase() == "tentang kania"){
      msg = {type: 'text', text: 'Kania bisa bantuin kamu cari tempat makan di sekitar kamu, kania dibantu sama kk google buat cari tempat makan terdekat'}
    }else if(message.text.toLowerCase() == "techdev"){
      msg = {type: 'text', text: 'Buat kalian yang mau belajar gimana caranya Kania bisa cari tempat makan di sekitar kamu, kamu bisa intip github Kania di sini : https://github.com/dimasmamot/kania, bebas buat dicabangin kok kak'};
    }

    // if(message.text == 'photo'){
    //   console.log("event njaluk foto fired");
    //   var photoQuery = {
    //     maxwidth: 400,
    //     photoreference: "CnRtAAAATLZNl354RwP_9UKbQ_5Psy40texXePv4oAlgP4qNEkdIrkyse7rPXYGd9D_Uj1rVsQdWT4oRz4QrYAJNpFX7rzqqMlZw2h2E2y5IKMUZ7ouD_SlcHxYq1yL4KbKUv3qtWgTK0A6QbGh87GB3sscrHRIQiG2RrmU_jF4tENr9wGS_YxoUSSDrYjWmrNfeEHSGSc3FyhNLlBU"
    //   };
    //   var googleMapsClient = require('@google/maps').createClient({
    //     key: process.env.API_KEY
    //   });

    //   googleMapsClient.placesPhoto(photoQuery, function(err, response){
    //     if(err)
    //       console.log("Error query place photo : ", err);

    //     // console.log(response.req.socket._host);
    //     console.log(response.req.socket._host + "" + response.req.path);
    //   });
    // }  

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
      var limit = 5;

      console.log("Hasilnya ada : "+resultLength);

      
      if(resultLength == 0){
        var msg = {type: 'text', text: 'Aku ngga bisa nemuin tempat makan dengan radius 1KM dari tempat kamu nih, coba jalan aja dulu'};
        return client.replyMessage(event.replyToken, msg);
      }
      else if(resultLength <5){
        limit = result.length;
      }
      for (var i = 0; i < resultLength; i++) {
        // console.log("photoreference["+i+"]:"+result[i].photos[0].photo_reference);
        // console.log("vicinity["+i+"]:"+result[i].vicinity);
      }

      // console.log("Hasilnya : ");
      // console.log(result);
      for(var i=0; i<resultLength;i++){

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
          continue;
        }

        var myFunction = function(i){
          googleMapsClient.placesPhoto(photoQuery, function(err, response){
            // console.log("host: "+response.req.socket._host + "" + response.req.path);
            if(err)
              console.log("Error query place photo : ", err);
            var tmpObj = {
              "thumbnailImageUrl": "https://" + response.req.socket._host + "" + response.req.path,
              "title": trimString40(result[i].name),
              "text": trimString60(result[i].vicinity),
              "actions": [{
                "type": "uri",
                "label": "Liat Map",
                "uri": "https://www.google.com/maps/@"+result[i].geometry.location.lat+","+result[i].geometry.location.lng+",20z"
              }]
            };
            // console.log("Objek : "+i);
            // console.log(tmpObj);
            tmpMsg.template.columns.push(tmpObj);
            // console.log("sudah ke push "+i);
            // console.log(tmpMsg);
            // console.log(photoQuery);
            if(tmpMsg.template.columns.length == limit){
              console.log("Ketemu lima buah dan berhasil semua");
              // console.log(tmpMsg.template.columns.length);
              // console.log(tmpMsg);
              console.log(tmpMsg.template.columns);
              client.replyMessage(event.replyToken, tmpMsg).catch((err) =>{
                console.log("Reply error", err);
                var msg = {type: 'text', text: 'Kania bingung, ada yang salah, maaf ya, coba lagi deh'};
                client.replyMessage(event.replyToken, msg);
              });
              // console.log("Isinya template message "+tmpMsg.template.columns.length);
            }else if(tmpMsg.template.columns.length == 0 && i == (resultLength-1)){ //Kalau item isinya kosong sedangkan indeks sudah sampai pucuk
              console.log("Ngga ketemu apa apa");

              var msg = {type:'text', text: 'Aku ngga bisa nemuin tempat makan dengan radius 1KM dari tempat kamu nih, coba jalan aja dulu'};
              client.replyMessage(event.replyToken, msg).catch((err) =>{
                console.log("Reply error", err);
                var msg = {type:'text', text:'Kania bingung, ada yang salah, maaf ya, coba lagi deh'};
                client.replyMessage(event.replyToken, msg);
              });;
            }
            else if(tmpMsg.template.columns.length < limit && i == (resultLength-1)){ //Kalau item isinya kurang dari lima tapi indeks sudah mentok
              console.log("Ketemu cuman : "+tmpMsg.template.columns.length);

              client.replyMessage(event.replyToken, tmpMsg).catch((err) =>{
                console.log("Reply error", err);
                var msg = {type :'text', text:'Kania bingung, ada yang salah, maaf ya, coba lagi deh'};
                client.replyMessage(event.replyToken, msg);
              });
            }
          });
        }

        // try{
        //   console.log("array object ke : " + i);
        //   console.log(result[i].photos);
        // }catch(err){
        //   console.log("Error parsing coy",err);
        // }
        myFunction(i); 
      }

      if(resultLength == 0){
        var msg = {type: 'text', text: 'Aku ngga bisa nemuin tempat makan dengan radius 1KM dari tempat kamu nih, coba jalan aja dulu'};
        return client.replyMessage(event.replyToken, msg);  
      }
      
    });
  }
}

function trimString40(stringnya){
  if(stringnya.length >= 40){
    return stringnya.substring(0,39);
  }else{
    return stringnya;
  }
}

function trimString60(stringnya){
  if(stringnya.length >= 60){
    return stringnya.substring(0,59);
  }else{
    return stringnya;
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
