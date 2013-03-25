var mongoose = require('mongoose');
var feedparser = require('feedparser')
var request = require('request');

var feedSchema = mongoose.Schema({
    _id:              { type: String, required: true, unique: true },
    title:            String,
    description:      String,
    link:             String,
    xmlUrl:           String,
    date:             { type: Date },
    pubDate:          { type: Date },
    author:           String,
    language:         String,
    image:            { title: String, url: String },
    favicon:          String,
    copyright:        String,
    generator:        String,
    categories:       [String]
});

feedSchema.virtual('url').get(function () {
  return this._id;
});

feedSchema.virtual('url').set(function (url) {
  this._id = url;
});

var Feed = mongoose.model('Feed', feedSchema);

var articleSchema = mongoose.Schema({
    title:            String,
    description:      String,
    link:             String,
    origLink:         String,
    date:             { type: Date },
    pubDate:          { type: Date },
    author:           String,
    guid:             String,
    comments:         String,
    image:            { title: String, url: String },
    categories:       [String],
    source:           { title: String, url: String },
    enclosures:       [{ url: String, type: String, length: String }],
    feed:             { type: String, ref: 'Feed' },
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
    Feed.count({ _id: url }, function(error, count) {
        if(error != null) {
            console.error('Failed to check if feed exists in MongoDB: '+error);
        }
        else {
            if(count == 0) {
               requestAndParseFeed(url);
            }
            else if(count == 1) {
                console.warn('Feed '+url+' already exists in the MongoDB. '
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
        .on('article', function(article) { saveOrUpdateArticle(article, url) })
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
    Feed.findOne({ _id: url }, function(error, feedDocument) {
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
            console.log('Added new feed "'+feedDocument.url+'" to MongoDB.');
        }
    });
}

function updateFeedMeta(feedDocument, meta) {
    if(feedRequiresUpdate(feedDocument, meta)) {
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

function feedRequiresUpdate(feedDocument, meta) {
    var requiresUpdate = false;
    
    if(feedDocument.title != meta.title &&
        feedDocument.description != meta.description &&
        feedDocument.link != meta.link &&
        feedDocument.xmlUrl != meta.xmlUrl &&
        feedDocument.author != meta.author &&
        feedDocument.language != meta.language &&
        feedDocument.image.title != meta.image.title &&
        feedDocument.image.url != meta.image.url &&
        feedDocument.favicon != meta.favicon &&
        feedDocument.copyright != meta.copyright &&
        feedDocument.generator != meta.generator &&
        JSON.stringify(feedDocument.categories) !=
            JSON.stringify(meta.categories)) {        
        requiresUpdate = true;
    }
    
    return requiresUpdate;
}

function createFeedDocument(meta, url) {
    return new Feed({ url: url, title: meta.title,
        description: meta.description, link: meta.link, xmlUrl: meta.xmlUrl,
        date: meta.date, pubDate: meta.pubDate, author: meta.author,
        language: meta.language, image: meta.image, favicon: meta.favicon,
        copyright: meta.copyright, generator: meta.generator,
        categories: meta.categories });
}

function saveOrUpdateArticle(article, url) {
    Article.findOne({ guid: article.guid, feed: url }, function(error, articleDocument) {
        if(error != null) {
            console.error('Failed to get article from MongoDB: '+error);
        }
        else {
            if(articleDocument == null) {
                saveArticle(article, url);
            }
            else {
                updateArticle(articleDocument, article);
            }
        }
    });  
}

function saveArticle(article, url) {
    var articleDocument = createArticleDocument(article, url);
        
    articleDocument.save(function (error, articleDocument) {
        if(error != null) {
            console.error('Failed to save article to MongoDB: '+error);
        }
        else {
            console.log('Added new article "'+articleDocument.guid
            + '" to MongoDB.');
        }
    });
}

function updateArticle(articleDocument, article) {
    if(articleRequiresUpdate(articleDocument, article)) {    
        articleDocument.title = article.title;
        articleDocument.description = article.description;
        articleDocument.link = article.link;
        articleDocument.xmlUrl = article.xmlUrl;
        articleDocument.date = article.date;
        articleDocument.pubDate = article.pubDate;
        articleDocument.author = article.author;
        articleDocument.language = article.language;
        articleDocument.image = article.image;
        articleDocument.favicon = article.favicon;
        articleDocument.copyright = article.copyright;
        articleDocument.generator = article.generator;
        articleDocument.categories = article.categories;
    
        articleDocument.save(function (error, feedDocument) {
            if(error != null) {
                console.error('Failed to update article to MongoDB: '+error);
            }
            else {
                console.log('Updated article "'+articleDocument.guid+'" in MongoDB.');
            }
        });
    } 
}

function articleRequiresUpdate(articleDocument, article) {
    var requiresUpdate = false;
    
    if(articleDocument.title != article.title &&
        articleDocument.description != article.description &&
        articleDocument.link != article.link &&
        articleDocument.origLink != article.origLink &&
        articleDocument.author != article.author &&
        articleDocument.guid != article.guid &&
        articleDocument.comments != article.comments &&
        articleDocument.image.title != article.image.title &&
        articleDocument.image.url != article.image.url &&
        JSON.stringify(articleDocument.categories) !=
            JSON.stringify(article.categories) &&
        articleDocument.source.title != article.source.title &&
        articleDocument.source.url != article.source.url &&
        articleDocument.enclosures.url != article.enclosures.url &&
        articleDocument.enclosures.type != article.enclosures.type &&
        articleDocument.enclosures.length != article.enclosures.length) {        
        requiresUpdate = true;
    }
    
    return requiresUpdate;
      
}

function createArticleDocument(article, url) {
    return new Article({ title: article.title,
        description: article.description, link: article.link,
        origLink: article.origLink, author: article.author, guid: article.guid,
        comments: article.comments, image: article.image,
        categories: article.categories, source: article.source,
        enclosures: article.enclosures, feed: url });
}

function updateDatabase() {
    Feed.find(function(error, feedDocuments) {
        if(error != null) {
            console.error('Failed to get feeds from MongoDB: '+error);
        }
        else {
            feedDocuments.forEach(function(feedDocument) {
                console.log('Updating feed and articles from '
                + feedDocument.url);
                requestAndParseFeed(feedDocument.url);
            });
        }
    });
}

exports.connect = connect;
exports.addFeed = addFeed;
exports.updateDatabase = updateDatabase;
