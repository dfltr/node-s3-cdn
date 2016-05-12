'use strict';

var gulp = require('gulp');
var gulpSass = require('gulp-sass');
var S3CDN = require('../index.js');

var cdn = new S3CDN({
  accessKeyId: 'key',
  secretAccessKey: 'secret',
  bucket: 'bucket',
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
