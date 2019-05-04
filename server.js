const express = require('express');
const http = require('http');
const https = require('https');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const api = require("./api");

const { secretKeyAuthorization } = require('./authorization');
const { sslCredentials } = require('./ssl-credentials');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/api', secretKeyAuthorization, api)

const httpServer = http.createServer(app);
const httpsServer = https.createServer(sslCredentials, app);

const HTTP_PORT = process.env.PORT || 8085;
const HTTPS_PORT = process.env.SSL_PORT || 8443;

httpServer.listen(HTTP_PORT, () => {
    console.log("DIALOGFLOW ARTILLERY DELEGATE");
    console.log(`app listening on port ${HTTP_PORT}`);
});
httpsServer.listen(HTTPS_PORT, () => {
    console.log("DIALOGFLOW ARTILLERY DELEGATE SSL");
    console.log(`app listening on port ${HTTPS_PORT}`);
});

