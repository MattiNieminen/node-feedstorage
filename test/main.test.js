var expect = require('chai').expect
    feedstorage = require('../main');

var testFeedUrl = 'https://raw.githubusercontent.com/MattiNieminen/'+
    'node-feedstorage/master/test/sample.xml';

describe('feedstorage', function() {

    before('Connect to local MongoDB db called node-feedstorage-test',
            function(done) {
        feedstorage.connect({uri: 'localhost',
            database: 'node-feedstorage-test', callback: done});
    });

    afterEach('Clean all feeds and articles from database between tests',
            function(done) {
        feedstorage.removeFeed(testFeedUrl, done);
    });

    describe(".addFeed(url, callback)", function() {
        it('should add and parse rss feed hosted at Github to database',
                function(done){
            feedstorage.addFeed(testFeedUrl, function() {
                /* It is not possible to guarantee that all articles have been
                 * written to the database even when using callbacks (as
                 * callback is called then the stream hits end, not when last
                 * article is written to db), so let's wait a bit.
                 */
                setTimeout(function() {
                    feedstorage.getArticlesByKeyword('', {},
                            function(articles) {
                        expect(articles.length).to.equal(9);
                        done();
                    });
                }, 500);

            });
        });
    });
});