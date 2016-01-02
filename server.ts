import Winston = require('winston');
import path = require('path');
import fs = require('fs');
import tilesource = require('csweb-tile');
import csWebNews = require('csweb-news');
import chokidar = require('chokidar');
import * as csweb from 'csweb';

// Read the configuration file that should contain API-keys and keywords
var config = require('./configuration.json');
var configurationOK = true;
if (!config || !config.hasOwnProperty('openCalaisApiKey') || !config.hasOwnProperty('alchemyFeedApiKey')
    || !config.hasOwnProperty('keywords')) {
    console.log('ERROR: Configuration file not valid. It should contain the keys: openCalaisApiKey, alchemyFeedApiKey, keywords');
    configurationOK = false;
}

Winston.remove(Winston.transports.Console);
Winston.add(Winston.transports.Console, <Winston.ConsoleTransportOptions>{
    colorize: true,
    label: 'csWeb',
    prettyPrint: true
});

var newsLayerId = 'newsfeed';

var cs = new csweb.csServer(__dirname, <csweb.csServerOptions>{
    port: 3003
});

cs.start(() => {
    var ts = new tilesource.TileSource(cs.server, <tilesource.TileSourceOptions>{
        sources: path.join(__dirname, 'tilesources')
    });

    //Create newsfeed if the required parameters are in the configuration file
    if (configurationOK) {
        // Create empty newsfeed layer
        var layer = <any>{ id: newsLayerId };
        var newsFolder = path.join(__dirname, 'public', 'data', 'news');
        if (!fs.existsSync(newsFolder)) fs.mkdirSync(newsFolder);
        cs.api.createLayer(layer, {}, (result) => {
            cs.api.addUpdateLayer(layer, {}, () => { });
        });

        // Init news feed
        var opts = { corrs: true,
          newsFolder: newsFolder,
          alchemyApi: config.alchemyFeedApiKey,
          calaisApi: config.openCalaisApiKey,
          keywords: config.keywords,
          updateInterval: config.updateIntervalSeconds
        };
        var ns = new csWebNews.NewsSource(cs.server, opts);

        // Watch newsfolder for new items        
        console.log('Watch newsfolder: ' + newsFolder);
        var watcher = chokidar.watch(newsFolder, { ignoreInitial: false, ignored: /[\/\\]\./, persistent: true });
        watcher.on('all', ((action, pathName) => {
            if (action === 'add' || action === 'change') {
                Winston.info('newsstore: new item found : ' + pathName);
                parseFeature(pathName, (f) => {
                    if (f) {
                        cs.api.updateFeature(newsLayerId, f, {}, () => {});
                    }
                });
            }
            if (action === 'unlink') {
                Winston.info('newsstore: removing item : ' + pathName);
                var id = path.basename(pathName, 'json');
                cs.api.deleteFeature(newsLayerId, id, {}, () => {});
            }
        }));
    }
    console.log('started');
});

function parseFeature(file: string, cb: Function) {
    fs.readFile(file, 'utf-8', (err, feature) => {
       if (err) {
           console.log('Error reading newsitem');
           cb();
       } else {
           cb(JSON.parse(feature));
       }
    });
}