var mongoose = require('mongoose');
var feedparser = require('feedparser')
var request = require('request');

var feedSchema = mongoose.Schema({
    title:            String,
    description:      String,
    link:             String,
    xmlUrl:           String,
    date:             { type: Date, default: Date.now },
    pubDate:          { type: Date, default: Date.now },
    author:           String,
    language:         String,
    image:            { title: String, url: String },
    favicon:          String,
    copyright:        String,
    generator:        String,
    categories:       [String]
});

function connect(uri, database, port) {
    port = typeof port !== 'undefined' ? port : 27017;
    mongoose.connect(uri, database, port);
    
    mongoose.connection.on('error', function(e){
        console.log("Could not connect to MongoDB: "+e.message);
        process.exit(1);
    });
    
    mongoose.connection.once('open', function callback () {
        console.log("Connection to MongoDB was successful.");
    });
}

function addFeed(uri) {
    //TODO CHECK IF EXISTING, ELSE MAKE REQUEST AND PARSE
    request(createRequest(uri), handleResponse);
}

function createRequest(uri) {
    var request = { uri: uri };
    return request;
}

function handleResponse(error, response, body) {
    if(error != null) {
        console.log('error: '+error);
    }
    else if (response.statusCode == 200) {
        feedparser.parseString(body)
        .on('meta', saveFeedMeta)
        .on('article', saveArticle);
    }
    else if (response.statusCode == 304) {
        //HTTP status code for not modified, do nothing
    }
    else {
        console.log('HTTP status code received that can not be handled by this module: '+response.statusCode);
    }
}

function saveFeedMeta(meta) {

}

function saveArticle(article) {

}

exports.connect = connect;
exports.addFeed = addFeed;
