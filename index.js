var fs = require('fs-extra');
var ProgressBar = require('progress');
var s3 = require('s3');
var sass = require('node-sass');
var sha1 = require('crypto-js/sha1');

var cdn = function(options) {
  if(!options || !options.accessKeyId || !options.secretAccessKey || !options.bucket || !options.cdnUrl) {
    throw 'S3 accessKeyId, secretAccessKey, bucket, and cdnUrl must be set in options'
  }

  this.accessKeyId = options.accessKeyId;
  this.secretAccessKey = options.secretAccessKey;
  this.bucket = options.bucket;
  this.ignore = options.ignore || [];
  this.hashFile = options.hashFile || (__dirname + '/cdn-hash.json');
  this.cdnUrl = options.cdnUrl;

  this.client = s3.createClient({
    s3Options: {
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey
    }
  });
}

cdn.prototype.upload = function(assetDir, callback = () => {}) {
  if(!assetDir) {
    throw 'upload() requires param assetDir';
  }

  var hash = sha1('SterlingMalloryArcher' + Math.random()).toString().substring(0, 7);

  //TODO: tmpDir never gets removed if anything fails before the cleanup phase
  var tmpDir = `/tmp/${hash}`;

  console.log(`Copying ${assetDir} to ${tmpDir}`);

  fs.copy(assetDir, tmpDir, (err) => {
    if(err) {
      console.log('ERROR: ', err);
      return false;
    }

    var promises = [];

    this.ignore.forEach((ignoredFile) => {
      var ignoredPath = `${tmpDir}/${ignoredFile}`; 

      console.log(`Removing ignored file: ${ignoredPath}`);

      promises.push(new Promise((resolve, reject) => {
        //TODO: This should stat the file and note whether it's deleting or skipping
        fs.remove(ignoredPath, (err) => {
          if(err) {
            reject(err);
          } else {
            resolve(ignoredPath);
          }
        });
      }));
    })

    Promise.all(promises).then((values) => {
      console.log(`Copying ${tmpDir} to ${this.bucket}`);

      var bar;

      var uploader = this.client.uploadDir({
        localDir: tmpDir,

        s3Params: {
          Bucket: this.bucket,
          Prefix: `${hash}`
        }
      }).on('error', (err) => {
        console.log('ERROR: ', err);
      }).on('progress', () => {
        if(uploader.progressAmount > 0) {
          if(!bar) {
            bar = new ProgressBar('Uploading ' + Math.round(uploader.progressTotal / 1024) + 'MB to S3 (' + this.bucket + ') - [:bar] :percent, ETA :etas', {
              complete: '=',
              incomplete: ' ',
              total: 50
            });
          }

          bar.update(uploader.progressAmount / uploader.progressTotal);
        }
      }).on('end', () => {
        console.log('Upload finished!');
        console.log(`Removing temp dir: ${tmpDir}`);

        fs.remove(tmpDir, (err) => {
          if(err) {
            console.log('ERROR: ', err);
          } else {
            fs.writeJson(this.hashFile, { hash: hash }, {});
          }

          callback();
        });
      });
    }).catch((err) => {
      console.log('ERROR: ', err);
    });
  });
}

cdn.prototype.clean = function(callback = () => {}) {
  var hash = require(this.hashFile).hash;

  var prefixes = [];

  this.client.listObjects({
    s3Params: {
      Bucket: this.bucket,
      Delimiter: '/'
    }
  }).on('data', (data) => {
    prefixes = prefixes.concat(data.CommonPrefixes.map(p => p.Prefix));
  }).on('end', () => {
    var deletedPrefixes = prefixes.filter(p => p !== hash + '/');

    var promises = [];

    console.log(`Found ${deletedPrefixes.length} old directories`);

    deletedPrefixes.forEach((prefix) => {
      console.log('Deleting: ' + prefix);

      promises.push(new Promise((resolve, reject) => {
        var deleter = this.client.deleteDir({
          Bucket: this.bucket,
          Prefix: prefix
        }).on('error', (err) => {
          reject(err);
        }).on('end', () => {
          resolve(prefix);
        })
      }));
    });

    Promise.all(promises).then((values) => {
      callback();
    }).catch((err) => {
      console.log('ERROR: ', err);
    });
  });
}

cdn.prototype.getHash = function() {
  var result = false;

  try {
    var stat = fs.statSync(this.hashFile);

    if(stat.isFile()) {
      let hashFile = require(this.hashFile);

      if(hashFile.hash) {
        result = hashFile.hash;
      }
    }
  } catch(noHashFile) {}

  return result;
}

cdn.prototype.getUrl = function(path) {
  var hash = this.getHash();
  var result;

  if(hash && process.env.NODE_ENV === 'production') {
    result = `${this.cdnUrl}/${hash}${path}`;
  } else {
    result = path;
  }

  return result;
}

cdn.prototype.helpers = {
  sass: function(path) {
    return sass.types.String(`url('${this.getUrl(path.getValue())}')`);
  }
}

module.exports = cdn;
