var mongoose = require('mongoose');
var feedparser = require('feedparser')
var request = require('request');

var feedSchema = mongoose.Schema({
    url:              { type: String, required: true }
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

var Feed = mongoose.model('Feed', feedSchema);

function connect(uri, database, port) {
    port = typeof port !== 'undefined' ? port : 27017;
    mongoose.connect(uri, database, port);
    
    mongoose.connection.on('error', function(e){
        console.error("Could not connect to MongoDB: "+e.message);
        process.exit(1);
    });
    
    mongoose.connection.once('open', function callback () {
        console.log("Connection to MongoDB was successful.");
    });
}

function addFeed(url) {
    //TODO CHECK IF EXISTING, ELSE MAKE REQUEST AND PARSE
    request(createRequest(url), function(error, response, body)
        { handleResponse(url, error, response, body) });
}

function createRequest(url) {
    var request = { uri: url };
    return request;
}

function handleResponse(url, error, response, body) {
    if(error != null) {
        console.error('error: '+error);
    }
    else if (response.statusCode == 200) {
        feedparser.parseString(body)
        .on('meta', function(meta) { saveFeedMeta(meta, url) })
        .on('article', saveArticle);
    }
    else if (response.statusCode == 304) {
        //HTTP status code for not modified, do nothing
    }
    else {
        console.warn('HTTP status code received that can not be handled by '
            + 'this module: '+response.statusCode);
    }
}

function saveFeedMeta(meta, url) {
    var feedDocument = new Feed({ url: url, title: meta.title,
        description: meta.description, link: meta.link, xmlUrl: meta.xmlUrl,
        date: meta.date, pubDate: meta.pubDate, author: meta.author,
        language: meta.language, image: meta.image, favicon: meta.favicon,
        copyright: meta.copyright, generator: meta.generator,
        categories: meta.categories });
        
    feedDocument.save(function (error, feedDocument) {
        if(error != null) {
            console.error('Failed to save feed meta to MongoDB: '+error);
        }
        else {
            //Saved the metadata, do nothing
        }
        
    });
}

function saveArticle(article) {

}

exports.connect = connect;
exports.addFeed = addFeed;
