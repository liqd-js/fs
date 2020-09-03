'use strict';

const FileCollection = require('./classes/file_collection');

const FS = module.exports = class FS
{
	static find( directories, pattern = undefined, on_change = undefined )
	{
		return FileCollection.find( directories, pattern, on_change );
	}
}
