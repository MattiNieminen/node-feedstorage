node-feedstorage
================

Node.js module that requests URLs of RSS / Atom feeds, parses them. It writes metadata about feed and articles to MongoDB.

## Dependencies

* Mongoose
* Feedparser
* Request
* Chardet
* Iconv-lite

## Usage

Connecting to running MongoDB instance:

```javascript
var feedstorage = require('./node-feedstorage');
//port and callback are optional
feedstorage.connect({uri: 'localhost', database: 'myDatabase', port: 27017, callback: function() {}});
```

Adding feed to database and automatically parse articles from it:

```javascript
feedstorage.addFeed('http://rss.cnn.com/rss/edition.rss');
```

Note: Parsing happens only if the returned HTTP status code is 200 (OK). Feedstorage supports 304 (Not modified) and does not cause useless overhead.

To re-request all feeds and update their metada, save new articles and update changed articles:

```javascript
feedstorage.updateDatabase();
```

Convenience method for setInterval to updating database at x milliseconds:

```javascript
feedstorage.updateDatabaseAtInterval(milliseconds);
```

Note: Don't harass RSS providers. Use parameters like 10000 (ten seconds) for most reliable results.

To stop the update interval:

```javascript
feedstorage.stopUpdateDatabaseAtInterval();
```

Saving feeds would be useless without a way to query the database:

```javascript
feedstorage.getArticlesByKeyword(keywordAsString, options, function(articles) {
    //This is callback
         
    articles.forEach(function(article) {
        console.log(article.title);
        console.log(article.description);
    });
});
```

See https://github.com/danmactough/node-feedparser for all article properties available.

Options supported are:

* from: Date object. Only articles newer than will be fetched.
* to: Date object. Only articles older than will be fetched.
* limit: limit the amount of articles to be fetched.

There is also a query method for multiple keywords. Here is an example of it with some options used.

```javascript
var keywords = ['nokia', 'apple'];

var from=new Date();
from.setMinutes(from.getMinutes() - 500);

var limit = 15;

feedstorage.getArticlesByKeywordArray(keywords, {from: from, limit: limit}, function(articles) {
    //This is callback
});
```

Finally, to remove feeds from database:

```javascript
feedstorage.removeFeed(url);
```

The above code will also set timeout for removing all articles related to that feed.

Is your database filling up? Remove old articles like this:

```javascript
feedstorage.removeArticlesOlderThan(days);
```
## Todo

* Usage of HTTP header ETag
* More options
* Unit testing is probably not applicable here, but maybe some integration tests
  with real feeds?
