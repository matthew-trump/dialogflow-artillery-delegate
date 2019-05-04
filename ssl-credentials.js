const fs = require('fs');

const SSL_PRIVATE_KEY = process.env.SSL_PRIVATE_KEY;
const SSL_CERTIFICATE = process.env.SSL_PRIVATE_KEY;
const SSL_KEY_FORMAT = process.env.SSL_KEY_FORMAT || 'utf8';

const privateKey = fs.readFileSync(SSL_PRIVATE_KEY, SSL_KEY_FORMAT);
const certificate = fs.readFileSync(SSL_CERTIFICATE, SSL_KEY_FORMAT);
const credentials = { key: privateKey, cert: certificate };

module.exports = { sslCredentials: credentials };