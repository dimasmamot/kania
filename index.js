const express = require('express');
const line = require('@line/bot-sdk');

//buat LINE SDK config untuk variabel secret & accesstoken
const config = {
	channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
	channelSecret: process.env.CHANNEL_SECRET,
};

//buat LINE SDK Client
const cliient = new line.Client(config);

//buat apps express framework
const app = express();

//register webhook handler pake middleware
app.post('/webhook', middleware(config), (req,res)=>{
	Promise
		.all(req.body.events.map(handleEvent))
		.then((result) => res.json(result));
});

function handleEvent(event){
	if(event.type !== 'message' || event.message.type !== 'text'){
		return Promise.resolve(null);
	}

	const echo = {type: 'text', text: event.message.text };

	return client.replyMessage(event.replyToken, echo);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`listening on ${port}`);
})