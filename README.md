# node-s3-cdn

A simple Node.js library for versioning and uploading your assets to S3, then pointing to those assets in your views, stylesheets, and scripts.

For the TL;DR version see [/test/gulpfile.js](https://github.com/dfltr/node-s3-cdn/blob/master/test/gulpfile.js)

Express, Gulp, Handlebars, and Sass are used throughout, but helpers and examples for other libs are more than welcome.

##Configuration

Instantiate the cdn with your s3 credentials and config options.
<pre>
var S3CDN = require('node-s3-cdn');

var cdn = new S3CDN({
  accessKeyId: 'your_s3_key',
  secretAccessKey: 'your_s3_secret',
  bucket: 'your_s3_bucket',
  hashFile: __dirname + '/your_asset_version_hash_will_be_stored_here.json',
  cdnUrl: 'https://your.cdn.domain.com',
  envList: ['production', 'an_env_in_which_you_want_full_cdn_urls']
});
</pre>

Then set your Sass up to compile in Gulp (or whatever):

<pre>
gulp.task('sass', (done) => {
  gulp.src(__dirname + '/test.scss')
    .pipe(gulpSass({
      outputStyle: 'compressed',
      functions: {
        //Built-in Sass helper!
        'cdn($path)': function(path) { return cdn.helpers.sass.call(cdn, path) }
      }
    }).on('error', console.log))
    .pipe(gulp.dest(__dirname + '/asset_folder'))
    .on('end', function() {
      done();
    });
});
</pre>

...or set your Handlebars up to compile in Express (or whatever):

<pre>
var exphbs = require('express-handlebars');

var hbs = exphbs.create({
  defaultLayout: 'your_layout',
  extname: '.hbs',
  helpers: {
    cdn: function(path) {
      //Generic cdn helper if you just need to return the raw url
      return cdn.getUrl.call(cdn, path);
    }
  }
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
</pre>

##Using template helpers

If you write Sass like this:
<pre>
.foo {
  background-image: cdn('/some/image.gif');
}
</pre>

It will come out like this when `NODE_ENV === 'production'`:
<pre>
.foo {
  background-image: url('https://your.cdn.domain.com/L0lwH47/some/image.gif');
}
</pre>

And like this otherwise:
<pre>
.foo {
  background-image: url('/some/image.gif');
}
</pre>

If you write Handlebars like this:
<pre>
 &lt;img src="{{cdn '/some/image.gif'}}" />
</pre>

It will come out like this when `NODE_ENV === 'production'`:
<pre>
 &lt;img src="https://your.cdn.domain.com/L0lwH47/some/image.gif" />
</pre>

And like this otherwise:
<pre>
&lt;img src="/some/image.gif" />
</pre>

##Uploading assets to S3

To generate a new version hash and upload the contents of `./asset_folder/*` to `your_s3_bucket/version_hash/*`:
<pre>
//Gulp isn't required, roll this task however you prefer
gulp.task('cdn:upload', (done) => {
  //First arg is path to compiled asset folder, second is callback
  cdn.upload('./asset_folder', done);
});
</pre>

Remember when you set `hashFile: __dirname + '/your_asset_version_hash_will_be_stored_here.json'` above? That file will be updated whenever you run `cdn.upload` to match the new version hash, which will be the name of the tag on S3 that your assets are now stored under. This file is how your template helpers will know how to write out full cdn urls.

From there you can configure Cloudfront to point to your S3 bucket and serve assets from `https://your.cdn.domain.com`.

##Versioning assets

To create a new version of your assets, run:

<pre>
//Auto-generate a hash
cdn.setVersion();

//Set your own manually
cdn.setVersion('1.8.7');
</pre>

You can run `cdn.upload` as many times as you want on the same version, only changed files will be overwritten.

##Cleaning up previous versions

**IMPORTANT CAVEAT:** `cdn.clean` will delete every other tag in your s3 bucket except the current asset version.

<pre>
gulp.task('cdn:clean', (done) => {
  cdn.clean(done);
});
</pre>

##Let's go over that again because this is very important

WHEN YOU RUN **CDN.CLEAN** IT WILL DELETE EVERY OTHER TAG IN YOUR S3 BUCKET EXCEPT THE CURRENT ASSET VERSION.

MAKE A SEPARATE S3 BUCKET SO YOU CAN VERSION YOUR CDN ASSETS. SERIOUSLY.

##Contributing
This is a very early version, feel free to file issues and pull requests for bug reports / suggestions / tests / etc.
