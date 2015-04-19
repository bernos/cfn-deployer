var path = require('path'),
	AWS  = require('aws-sdk'),
	fs   = require('fs'),
	_    = require('lodash'),
	l    = require('./logger.js');

module.exports = {
	uploadFolder : uploadFolder,
	uploadFile   : uploadFile
}

function uploadFolder (folder, bucket, path, cb) {
	getFilesInFolder(folder, function(err, uploadList) {	
		var s3     = new AWS.S3(),
			result = [],
			errors = [];

		if (err) {
			cb(err);
		} else if (uploadList.length) {
			_.each(uploadList, function(file) {
				var key = path + "/" + file.substring(folder.length + 1);
				
				uploadFile(s3, bucket, key, file, function(err, data) {
					err ? errors.push(err) : result.push(data);

					if (result.length == uploadList.length) {
						cb(errors.length ? errors : false, result);
					}
				});
			});
		} else {
			cb(null, result)
		}				
	});
}

function uploadFile(s3, bucket, key, file, cb) {
    s3.upload({
        Bucket  : bucket,
        Key     : key,
        Body    : fs.createReadStream(file)
    })
    .on('httpUploadProgress', function(e) {
        l.info("Uploading %s Part %d - %d of %d.", key, e.part, e.loaded, e.total);
    })
    .send(cb);
}

function getFilesInFolder(folder, cb) {
	var files = [];

	fs.readdir(folder, function(err, entries) {
		if (err) {
			cb(err, files);
		} else if (entries.length) {

			(function checkFile(entry) {
				var fd = path.join(folder, entry);

				fs.stat(fd, function(err, stats) {
					if (err) {
						cb(err);
					} else {
						if (stats.isFile()) {
							files.push(fd);
						}
						if (entries.length) {
							checkFile(entries.pop());
						} else {
							cb(null, files)
						}
					}
				});
			})(entries.pop());		

		} else {
			cb(null, files);
		}
	});
}
