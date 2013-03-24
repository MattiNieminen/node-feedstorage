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
                updateFeedMeta(feedDocument, meta, url);
            }
        }
    });  
}

function saveFeedMeta(meta, url) {
    var feedDocument = createFeedDocument(meta, url);
        
    feedDocument.save(function (error, feedDocument) {
        if(error != null) {
            console.error('Failed to save feed meta to MongoDB: '+error);
        }
        else {
            console.log('Added new feed "'+feedDocument.url+'" to MongoDB');
        }
    });
}

function updateFeedMeta(feedDocument, meta, url) {
    if(!feedsEqual) {
        feedDocument.title = meta.title;
        feedDocument.description = meta.description;
        feedDocument.link = meta.link;
        feedDocument.xmlUrl = meta.xmlUrl;
        feedDocument.date = meta.date;
        feedDocument.pubDate = meta.pubDate;
        feedDocument.author = meta.author;
        feedDocument.language = meta.language;
        feedDocument.image = meta.image;
        feedDocument.favicon = meta.favicon;
        feedDocument.copyright = meta.copyright;
        feedDocument.generator = meta.generator;
        feedDocument.categories = meta.categories;
    
        feedDocument.save(function (error, feedDocument) {
            if(error != null) {
                console.error('Failed to update feed meta to MongoDB: '+error);
            }
            else {
                console.log('Updated feed "'+feedDocument.url+'" in MongoDB.');
            }
        });
    } 
}

function feedsEqual(feedDocument1, feedDocument2) {
    var equals = false;
    
    if(feedDocument1.url == feedDocument2.url &&
        feedDocument1.title == feedDocument2.title &&
        feedDocument1.description == feedDocument2.description &&
        feedDocument1.link == feedDocument2.link &&
        feedDocument1.xmlUrl == feedDocument2.xmlUrl &&
        feedDocument1.date == feedDocument2.date &&
        feedDocument1.pubDate == feedDocument2.pubDate &&
        feedDocument1.author == feedDocument2.author &&
        feedDocument1.language == feedDocument2.language &&
        feedDocument1.image == feedDocument2.image &&
        feedDocument1.favicon == feedDocument2.favicon &&
        feedDocument1.copyright == feedDocument2.copyright &&
        feedDocument1.generator == feedDocument2.generator &&
        feedDocument1.categories == feedDocument2.categories) {
        equals = true;
    }
    
    return equals;
}

function createFeedDocument(meta, url) {
    return new Feed({ url: url, title: meta.title,
        description: meta.description, link: meta.link, xmlUrl: meta.xmlUrl,
        date: meta.date, pubDate: meta.pubDate, author: meta.author,
        language: meta.language, image: meta.image, favicon: meta.favicon,
        copyright: meta.copyright, generator: meta.generator,
        categories: meta.categories });
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
    var articleDocument = createArticleDocument(article);
        
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

function createArticleDocument(article) {
    return new Article({ title: article.title,
        description: article.description, link: article.link,
        origLink: article.origLink, guid: article.guid,
        comments: article.comments, image: article.image,
        categories: article.categories, source: article.source,
        enclosures: article.enclosures });
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
exports.updateDatabase = updateDatabase;
