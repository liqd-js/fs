'use strict';

const fs = require( 'fs' );
const fsp = require( 'fs/promises' );
const path = require( 'path' );

async function traverse( dir, callback, prefix = '' )
{
    await fsp.readdir( dir ).then( files => Promise.all( files.map( async file =>
    {
        const stat = await fsp.stat( path.join( dir, file )), is_dir = stat.isDirectory();

        callback( path.sep + path.join( prefix, file ) + ( is_dir ? path.sep : '' ));

        is_dir && await traverse( path.join( dir, file ), callback, path.join( prefix, file ));
    })));
}

function distance( root, dir, score = { up: 1000, down: 1 })
{
    root = root.split( path.sep ).filter( Boolean );
    dir = dir.split( path.sep ).filter( Boolean );

    let i = 0;

    while( root[i] && root[i] === dir[i] ){ ++i }

    return ( root.length - i ) * score.up + ( dir.length - i ) * score.down;
}

const FileCollection = module.exports = class FileCollection
{
    #directories = []; #watchers = [];

    static async watch( directories, handler )
    {
        let watchers = [];

        await Promise.all( directories.map( async root => 
        {
            watchers.push( root );

            await traverse( root, ( entry ) =>
            {
                if( entry.endsWith( path.sep ))
                {
                    watchers.push( entry );
                }
            });
        }));

        return watchers;
    }

    static async find( directories, pattern, onchange )
    {
        let collection = new FileCollection()

        collection.#directories = await Promise.all( directories.map( async root => 
        {
            let entries = [];

            await traverse( root, ( entry ) =>
            {
                if( onchange && entry.endsWith( path.sep ))
                {
                    // watcher
                }

                ( !pattern || pattern.test( entry )) && entries.push( entry );
            })

            return { root: path.resolve( root ), entries: entries.sort() };
        }));

        return collection;
    }

    closest( pattern, root, options = {})
    {
        let entries = []; 
        
        options.ignoreCase && ( pattern = pattern.toLowerCase() );
        //!pattern.startsWith( path.sep ) && ( pattern = path.sep + pattern );
        
        for( let directory of this.#directories )
        {
            for( let entry of directory.entries )
            {
                if( options.ignoreCase ? entry.toLowerCase().endsWith( pattern ) : entry.endsWith( pattern ))
                {
                    entries.push({ directory, entry, distance: distance( root, entry )});
                }
            }
        }

        if( entries.length )
        {
            entries.sort(( a, b ) => a.distance - b.distance );

            return path.join( entries[0].directory.root, entries[0].entry );
        }
    }

    *[ Symbol.iterator ]()
    {
        for( let directory of this.#directories )
        {
            for( let entry of directory.entries )
            {
                yield path.join( directory.root, entry );
            }
        }
    }

    * entries()
    {
        for( let directory of this.#directories )
        {
            for( let entry of directory.entries )
            {
                yield [ directory.root, entry.substring(1) ];
            }
        }
    }

    get watchers(){ return this.#watchers }
}
/*
async function test()
{
    let collection = await FileCollection.find([ '/Users/tomaskorenko/Github/liqd-js/fs/', '/Users/tomaskorenko/Github/liqd-js/flow/', '/Users/tomaskorenko/Github/liqd-js/template/lib' ], /\/[^/]+.syntax/);

    console.log([...collection]);
    console.log([...collection.entries()]);

    //console.log( await collection.closest( 'test.js', 'classes/test.js', { ignoreCase: true }));
}

test();*/

//FileCollection.find([ '/Users/tomaskorenko/Github/liqd-js/fs/lib' ]).then( c => console.log([ ...c ]))
//FileCollection.watch([ '/Users/tomaskorenko/Github/liqd-js/fs/lib' ]).then( c => console.log([ ...c ]))

//distance( '/Users/tomaskorenko/Github/liqd-js/fs/lib/classes/', '/Users/tomaskorenko/Github/liqd-js/fs/lib/classes/test/' )