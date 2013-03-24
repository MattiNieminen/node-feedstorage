var mongoose = require('mongoose');
var feedparser = require('feedparser')
var request = require('request');

var feedSchema = mongoose.Schema({
    url:              { type: String, required: true, unique: true },
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

var articleSchema = mongoose.Schema({
    title:            String,
    description:      String,
    link:             String,
    origLink:         String,
    date:             { type: Date, default: Date.now },
    pubDate:          { type: Date, default: Date.now },
    author:           String,
    guid:             String,
    comments:         String,
    image:            { title: String, url: String },
    categories:       [String],
    source:           { title: String, url: String },
    enclosures:       [{ url: String, type: String, length: String }]
    //TODO population
});

var Article = mongoose.model('Article', articleSchema);

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
    Feed.count({ url: url }, function(error, count) {
        if(error != null) {
            console.error('Failed to check if feed exists in MongoDB: '+error);
        }
        else {
            if(count == 0) {
               requestAndParseFeed(url);
            }
            else if(count == 1) {
                console.log('Feed '+url+' already exists in the MongoDB. '
                + 'Skipping database write.');
            }
            else {
                console.error('Multiple documents with same url exist in '
                + 'MongoDB. This should not happen!');
            }
        }
    });
}

function requestAndParseFeed(url) {
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
        .on('meta', function(meta) { saveOrUpdateFeedMeta(meta, url) })
        .on('article', saveOrUpdateArticle)
        .on('error', function(error) { handleParseError(error, url) });
    }
    else if (response.statusCode == 304) {
        console.log('Feed '+url+' not modified (304). Skipping parsing.' );
    }
    else {
        console.warn('HTTP status code received that can not be handled by '
            + 'this module: '+response.statusCode);
    }
}

function handleParseError(error, url) {
    console.error('Could not parse feed at '+url+'. '+error);
}

function saveOrUpdateFeedMeta(meta, url) {
    Feed.findOne({ url: url }, function(error, feedDocument) {
        if(error != null) {
            console.error('Failed to get feed from MongoDB: '+error);
        }
        else {
            if(feedDocument == null) {
                saveFeedMeta(meta, url);
            }
            else {
                updateFeedMeta(feedDocument, meta);
            }
        }
    });  
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
            console.log('Added new feed "'+feedDocument.url+'" to MongoDB');
        }
        
    });
}

function updateFeedMeta(feedDocument, meta) {
    console.log('Should update feed, but not yet implemented.');
}

function saveOrUpdateArticle(article) {
    Article.findOne({ guid: article.guid }, function(error, articleDocument) {
        if(error != null) {
            console.error('Failed to get article from MongoDB: '+error);
        }
        else {
            if(articleDocument == null) {
                saveArticle(article);
            }
            else {
                updateArticle(articleDocument, article);
            }
        }
    });  
}

function saveArticle(article) {
    var articleDocument = new Article({ title: article.title,
        description: article.description, link: article.link,
        origLink: article.origLink, guid: article.guid,
        comments: article.comments, image: article.image,
        categories: article.categories, source: article.source,
        enclosures: article.enclosures });
        
    articleDocument.save(function (error, articleDocument) {
        if(error != null) {
            console.error('Failed to save article to MongoDB: '+error);
        }
        else {
            console.log('Added new article "'+articleDocument.guid
            + '" to MongoDB');
        }
    });
}

function updateArticle(articleDocument, article) {
    console.log('Should update article, but not yet implemented.');
}

function updateDatabase() {
    Feed.find(function(error, feedDocuments) {
        if(error != null) {
            console.error('Failed to get feeds from MongoDB: '+error);
        }
        else {
            feedDocuments.forEach(function(feedDocument) {
                console.log('Updating feed '+feedDocument.url);
                requestAndParseFeed(feedDocument.url);
            });
            
        }
    });
}

exports.connect = connect;
exports.addFeed = addFeed;
exports.updateDatabase = updateDatabase
