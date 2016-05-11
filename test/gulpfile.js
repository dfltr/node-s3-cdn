'use strict';

var gulp = require('gulp');
var S3CDN = require('./index.js');

gulp.task('cdn:upload', (done) => {
  var cdn = new S3CDN({
    accessKeyId: 'somekey',
    secretAccessKey: 'somesecret',
    bucket: 'somebucket'
  });

  cdn.upload('./test/dummy-data');
});

gulp.task('cdn:clean', (done) => {
  var cdn = new S3CDN({
    accessKeyId: 'somekey',
    secretAccessKey: 'somesecret',
    bucket: 'somebucket'
  });

  cdn.clean(() => {
    console.log('callback');
  });
});
