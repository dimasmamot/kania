'use strict';

const line = require('@line/bot-sdk');
const express = require('express');
const JSONParseError = require('@line/bot-sdk/exceptions').JSONParseError;
const SignatureValidationFailed = require('@line/bot-sdk/exceptions').SignatureValidationFailed

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

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const message = event.message;
  var msg = 'default msg';

  if(message.type == 'text' && message.text === 'test'){
    if(event.source.type === 'room'){
      msg = {type: 'tex', text: "Ini dari room revisi?"};
    }else if(event.source.type === 'group'){
      msg = {type: 'tex', text: "Ini dari grup?"};
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
