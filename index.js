const http = require('http'),
    express = require('express'),
    app = express(),
    server = require('http').Server(app),
    bodyParser = require('body-parser'),
    webpagePort = 8080,
    WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({server: server}),
    Gpio = require('pigpio').Gpio,
    MICROSECONDS_PER_CM = 1e6/34321, // The number of microseconds it takes sound to travel 1cm at 20 degrees celsius
    trigger = new Gpio(23, {mode: Gpio.OUTPUT}),
    echo = new Gpio(24, {mode: Gpio.INPUT, alert: true});

let lastScoreTime = new Date();

app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Error came ');
});

server.listen(webpagePort, function() {
  console.log('Server is running on ' + webpagePort);
});

wss.on('connection', function connection(ws) {
  console.log('WebSockets are ready!');
});

function broadcast(message) {
  if (message) {
    console.log('Broadcasting ' + message);
    wss.clients.forEach(function each(client) {
      client.send(message);
    });
  }
}

trigger.digitalWrite(0); // Make sure trigger is low

const watchHCSR04 = () => {
  let startTick;

  echo.on('alert', (level, tick) => {
    if (level == 1) {
      startTick = tick;
    } else {
      const endTick = tick;
      const diff = (endTick >> 0) - (startTick >> 0);
      let distance = diff / 2 / MICROSECONDS_PER_CM;
      let currentScoreTime = new Date();
      console.log(currentScoreTime, lastScoreTime, distance);
      if (distance < 11 && (currentScoreTime - lastScoreTime > 1000)) {
        lastScoreTime = currentScoreTime;
        broadcast('SCORE:' + (diff / 2 / MICROSECONDS_PER_CM));
      }
    }
  });
};

watchHCSR04();

setInterval(() => {
  trigger.trigger(10, 1); // Set trigger high for 10 microseconds
}, 100); // Trigger every 100 milliseconds
