'use strict';

var gulp = require('gulp');
var S3CDN = require('../index.js');

gulp.task('cdn:upload', (done) => {
  var cdn = new S3CDN({
    accessKeyId: 'key',
    secretAccessKey: 'secret',
    bucket: 'bucket',
    hashFile: __dirname + '/cdn-hash.json'
  });

  cdn.upload('./dummy-data', done);
});

gulp.task('cdn:clean', (done) => {
  var cdn = new S3CDN({
    accessKeyId: 'key',
    secretAccessKey: 'secret',
    bucket: 'bucket',
    hashFile: __dirname + '/cdn-hash.json'
  });

  cdn.clean(done);
});
