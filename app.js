console.clear()

// Globals - Set from environment variables if they exist, else default values
const PORT = process.env.PORT || 443;
const WHITELIST_PATH = process.env.WHITELIST_PATH || `${__dirname}/whitelist`;
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH || `${__dirname}/cert.pem`;
const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH || `${__dirname}/key.pem`;

// Module imports
const express = require("express");
const https = require('https');
const fs = require('fs');

// First bit that starts server setup, exit if it fails
setupServer().then(() => {
    console.log('Server setup complete!');
}).catch(err => {
    console.error(err);
    process.exit(1);
})

// Server setup
function setupServer(){
    return new Promise((resolve, reject) => {
        // Start server and attach all handlers
        startHttpsServer().then(app => {
            attachHttpsAccessHandler(app).then(() => {
                attachHttpsViewHandler(app).then(() => {
                    attachHttpsRouteHandler(app).then(() => {
                        resolve();
                    }).catch(reject)
                }).catch(reject)
            }).catch(reject)
        }).catch(reject)
    })
}

// Attach ejs template view handler
function attachHttpsViewHandler(app){
    return new Promise((resolve, reject) => {
        app.set('view engine', 'ejs')
        resolve();
    })
}

// Attach log and access handler
function attachHttpsAccessHandler(app){
    return new Promise((resolve, reject) => {
        // Handle all requests that come in
        app.all("*", (req, res, next) => {
            // Get the client address
            let addr = req.socket.remoteAddress;
    
            // Check if client is whitelisted
            isWhitelisted(addr).then(allowed => {
                let time = new Date().toLocaleString();
                let url = req.url;
                let method = req.method;
                let allowedStr = allowed ? 'Whitelisted' : 'Not whitelisted'
    
                // Log request info
                console.log(`${time} | ${allowedStr} | ${method} | ${addr} | ${url}`);
                
                if (allowed){
                    // Pass request to next handler if whitelisted
                    next();
                }
                else{
                    // Send forbidden error if not whitelisted
                    res.sendStatus(403).end();
                }
            }).catch(err => {
                // Log error and send server error code if failed to check whitelist
                console.error(err);
                res.sendStatus(500).end();
            })
        });

        resolve();
    })
}

// Attach route handler
function attachHttpsRouteHandler(app){
    return new Promise((resolve, reject) => {
        // Placeholder, sends text if visiting root of site
        app.get('/', (req, res) => {
            res.end('hello');
        })

        resolve();
    })
}

// Starts an https server
function startHttpsServer(){
    return new Promise((resolve, reject) => {
        // Get certificate credentials from files
        getHttpsCredentials(HTTPS_CERT_PATH, HTTPS_KEY_PATH).then(creds => {
            // Start and express app and https server
            let app = express();
            let httpsApp = https.createServer(creds, app);
        
            // Start listening
            httpsApp.listen(PORT, () => {
                console.log(`HTTP server running on port ${PORT}`);
            });

            // Resolve app for adding further handlers
            resolve(app);
        }).catch(err => {
            reject(err);
        })
    })
}

// Checks a client request address against a whitelist file
function isWhitelisted(addr){
    return new Promise((resolve, reject) => {
        // Make sure address is a string and not empty
        if (typeof addr !== typeof 'str' || addr.length == 0){
            return resolve(false);
        }

        // Read whitelist file
        readFilePromise(WHITELIST_PATH).then(data => {
            // Iterate over whitelisted address
            for (let line of data.split('\n')){
                if (line === addr){
                    // If address is found, then client is whitelisted
                    return resolve(true)
                }
            }

            // If address is not found, then not whitelisted
            resolve(false);
        }).catch(err => {
            reject(err)
        })
    })
}

// Reads HTTPS certificate files and return credentials object
function getHttpsCredentials(certPath, keyPath){
    return new Promise((resolve, reject) => {
        let credentials = {};

        // Array of promises
        let promises = [
            // Get Cert
            readFilePromise(certPath).then(data => {
                credentials['cert'] = data;
            }),
            // Get Key
            readFilePromise(keyPath).then(data => {
                credentials['key'] = data;
            })
        ];

        // Wait for promises to complete
        Promise.all(promises).then(() => {
            // If all went fine, resolve the credentials
            resolve(credentials)
        }).catch(err => {
            reject(err);
        })
    })
}

// Promise wrapper for fs.readFile
function readFilePromise(filepath){
    return new Promise((resolve, reject) => {
        // Read file, reject error or resolve data
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