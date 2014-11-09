var expect = require('chai').expect
    feedstorage = require('../main');

describe('feedstorage', function() {

    before(function(done) {
        console.log('Connecting to MongoDB (localhost, default port) to database called node-feedstorage-test');
        feedstorage.connect({uri: 'localhost', database: 'node-feedstorage-test', callback: done});
    });
});