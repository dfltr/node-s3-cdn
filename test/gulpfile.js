'use strict';

//Set your s3 keypair and bucket here for testing, it's in .gitignore for convenience
var credentials = require('./s3.json');

var gulp = require('gulp');
var gulpSass = require('gulp-sass');
var Handlebars = require('handlebars');
var S3CDN = require('../index.js');

var cdn = new S3CDN({
  accessKeyId: credentials.accessKeyId,
  secretAccessKey: credentials.secretAccessKey,
  bucket: credentials.bucket,
  hashFile: __dirname + '/cdn-hash.json',
  cdnUrl: 'https://media.giphy.com'
});

gulp.task('cdn:upload', (done) => {
  cdn.upload('./dummy-data', done);
});

gulp.task('cdn:clean', (done) => {
  cdn.clean(done);
});

gulp.task('sass', (done) => {
  gulp.src(__dirname + '/test.scss')
    .pipe(gulpSass({
      outputStyle: 'compressed',
      functions: {
        'cdn($path)': function(path) { return cdn.helpers.sass.call(cdn, path) }
      }
    }).on('error', console.log))
    .pipe(gulp.dest(__dirname + '/dummy-data'))
    .on('end', function() {
      done();
    });
});

gulp.task('handlebars', (done) => {
  Handlebars.registerHelper('cdn', function(path) {
    return cdn.getUrl.call(cdn, path);
  });

  var tpl = Handlebars.compile("<img src=\"{{cdn '/cant/tell/me/nothin.gif'}}\" />");

  console.log('Handlebars: ', tpl());

  done();
});