console.clear()

const PORT = process.env.PORT || 443;
const WHITELIST_PATH = process.env.WHITELIST_PATH || `${__dirname}/whitelist`;

const express = require("express");
const fs = require('fs');

let app = express();
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

app.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
});


function isWhitelisted(addr){
    return new Promise((resolve, reject) => {
        if (typeof addr !== typeof 'str' || addr.length == 0){
            return resolve(false);
        }

        fs.readFile(WHITELIST_PATH, 'utf-8', (err, data) => {
            if (err){
                reject(err)
            }
            else{
                for (let line of data.split('\n')){
                    if (line === addr){
                        return resolve(true)
                    }
                }

                resolve(false);
            }
        })
    })
}