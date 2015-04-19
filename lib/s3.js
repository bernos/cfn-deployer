var path = require('path'),
	glob = require('glob'),
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

// TODO: handle empty upload list
		_.each(uploadList, function(file) {
			var key = path + file.substring(folder.length);
			
			uploadFile(s3, bucket, key, file, function(err, data) {
				err ? errors.push(err) : result.push(data);

				if (result.length == uploadList.length) {
					cb(errors.length ? errors : false, result);
				}
			});
		});		
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
	glob(path.join(folder, "*.*"), cb);
}