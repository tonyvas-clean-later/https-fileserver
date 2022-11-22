console.clear()

const PORT = process.env.PORT || 443;
const WHITELIST_PATH = process.env.WHITELIST_PATH || `${__dirname}/whitelist`;
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH || `${__dirname}/cert.pem`;
const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH || `${__dirname}/key.pem`;

const express = require("express");
const https = require('https');
const fs = require('fs');

getHttpsCredentials(HTTPS_CERT_PATH, HTTPS_KEY_PATH).then(creds => {
    let app = express();
    let httpsApp = https.createServer(creds, app);

    app.set('view engine', 'ejs')

    app.all("*", (req, res, next) => {
        let addr = req.socket.remoteAddress;

        isWhitelisted(addr).then(allowed => {
            let time = new Date().toLocaleString();
            let url = req.url;
            let method = req.method;
            let allowedStr = allowed ? 'Whitelisted' : 'Not whitelisted'

            console.log(`${time} | ${allowedStr} | ${method} | ${addr} | ${url}`);
            
            if (allowed){
                next();
            }
            else{
                res.sendStatus(403).end();
            }
        }).catch(err => {
            console.error(err);
        })
    });

    app.get('/', (req, res) => {
        res.end('hello');
    })

    httpsApp.listen(PORT, () => {
        console.log(`HTTP server running on port ${PORT}`);
    });
}).catch(err => {
    console.error(err);
    process.exit(1);
})

function isWhitelisted(addr){
    return new Promise((resolve, reject) => {
        if (typeof addr !== typeof 'str' || addr.length == 0){
            return resolve(false);
        }

        readFilePromise(WHITELIST_PATH).then(data => {
            for (let line of data.split('\n')){
                if (line === addr){
                    return resolve(true)
                }
            }

            resolve(false);
        }).catch(err => {
            reject(err)
        })
    })
}

function getHttpsCredentials(certPath, keyPath){
    return new Promise((resolve, reject) => {
        let credentials = {};

        let promises = [
            readFilePromise(certPath).then(data => {
                credentials['cert'] = data;
            }),
            readFilePromise(keyPath).then(data => {
                credentials['key'] = data;
            })
        ];

        Promise.all(promises).then(() => {
            resolve(credentials)
        }).catch(err => {
            reject(err);
        })
    })
}

function readFilePromise(filepath){
    return new Promise((resolve, reject) => {
        fs.readFile(filepath, 'utf-8', (err, data) => {
            if (err){
                reject(err)
            }
            else{
                resolve(data)
            }
        })
    })
}