var azure_blobs  = require('./azure-blobs.js');
var BinaryServer = require('binaryjs').BinaryServer;
var fs           = require('fs');
var config       = require('./configs/app-config.js');
var http         = require('http');
var https        = require('https');
var server       = BinaryServer({ port: config.azure_proxy_port });
var log_name     = config.logs.access;
var url          = require('url');

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;

}

function generateRandomString(length){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function logMessage(msg){
    fs.appendFile(log_name, '[' + getDateTime() + '] ' + msg + "\n");
    
}
function getClientIP(client){
    return client._socket.upgradeReq.connection.remoteAddress;
}

server.on('connection', function(client){
    var client_authenticated = false;
    client.on('stream', function(stream, meta){
        switch(meta.stream_type){
            case 'auth_request':
                stream.on('data', function(data){
                    var auth_data = data;
                    if(config.check_auth(auth_data.user, auth_data.password)){
                        //Authenticated!
                        client.send({ auth_status: 'success' });
                        logMessage('User [' + auth_data.user + '] authenticated');
                        client_authenticated = true;
                    }
                    else {
                        // Auth failed!
                        client.send({ auth_status: 'failed' });
                        logMessage('User [' + auth_data.user + '] failed to authenticate using password: ' + auth_data.password);
                    }
                });
                break;
            case 'logout_request':
                stream.on('data', function(data){
                    var auth_data = data;
                    stream.write({ logout_status: 'success' });
                    logMessage('User [' + auth_data.user + '] logged out');
                    client_authenticated = false;
                    stream.end();
                });
                break;
            case 'file_upload':
                if(client_authenticated){
                    logMessage('Receiving file from client: ' + meta.name);
                    var generated_name = generateRandomString(15);
                    var extension = meta.name.substring(meta.name.lastIndexOf('.'));
                    var filename = '_tmp_/' + generated_name + extension;
                    var file = fs.createWriteStream(filename);
                    stream.pipe(file);
                    stream.on('data', function (data) {
                        stream.write({ rx: data.length / meta.size });
                    });
                    stream.on('end', function(){
                        logMessage('Received file from client: ' + filename);
                        logMessage('Uploading ' + filename + ' to Azure...');
                        stream.write({ end: true });
                        azure_blobs.upload(filename, config.blob_containers.pending, generated_name + extension, { title: meta.metadata.title })
                            .then(function(result){
                                logMessage('Uploaded ' + filename + ' to Azure.');
                            })
                            .fail(function(error){
                                logMessage('Failed to upload ' + filename + ' to Azure: ' + JSON.stringify(error));
                           });
                    });
                }
                else {
                    stream.write({ error : 'authorization required'});
                    stream.end();
                }
                break;
            case 'blob_list_retrieval':
                logMessage('Retrieving images from azure for client: ' + getClientIP(client));
                azure_blobs.getList(config.blob_containers.active).then(function(ack){
                    var blobs = [];
                    ack.entries.forEach(function(item){
                        blobs.push({ 
                            url : azure_blobs.getBlobUrl(config.blob_containers.active, item.name),
                            type : item.properties['content-type'],
                            uploaded : new Date(item.properties['last-modified']).getTime(),
                            name: item.name,
                            title: (typeof item.metadata.title != 'undefined') ? item.metadata.title : null
                        });
                    });
                    //sort blobs by date DESC
                    blobs.sort(function(a, b){
                        return b.uploaded - a.uploaded;
                    });
                    client.send({ blobs : blobs });
                });
                break;
            case 'url_download':
                if(client_authenticated){
                    stream.on('data', function(url){
                        logMessage('Downloading file: ' + url);
                        var generated_name = generateRandomString(15);
                        var ext_start = url.lastIndexOf('.');
                        var ext_end = url.indexOf('?', ext_start);
                        if(ext_end == -1){
                            ext_end = url.length;
                        }
                        var extension = url.substring(ext_start, ext_end);
                        var filename = '_tmp_/file_' + generated_name + extension;
                        var file = fs.createWriteStream(filename);
                        var http_handler = http;
                        if(url.indexOf("https") == 0){
                            http_handler = https;
                        }
                        
                        var request = http_handler.get(url, function(response) {
                            if(response.headers['content-type'].search('text') == -1){
                                response.pipe(file);
                                file.on('finish', function(){
                                    file.close();
                                    logMessage('Downloaded file ' + filename);
                                    logMessage('Uploading ' + filename + ' to Azure...');
                                    azure_blobs.upload(filename, config.blob_containers.pending, generated_name + extension, { title : meta.metadata.title })
                                        .then(function(result){
                                            logMessage('Uploaded ' + filename + ' to Azure.');
                                            stream.write({ end : true });
                                        })
                                        .fail(function(error){
                                            logMessage('Failed to upload ' + filename + ' to Azure: ' + JSON.stringify(error));
                                            stream.write({ end : false });
                                       });
                                });
                            }
                            else{
                                logMessage('Failed to download: ' + url);
                                stream.write({ end : false });
                            }
                            stream.end();
                        });
                    });
                }
                else{
                    client.send({ error : 'authorization required'});
                }
                break;
                /**
                 * Lists blobs from pending container
                 */
            case 'list_pending':
                if(client_authenticated){
                    logMessage('Retrieving pending blobs from azure for client: ' + getClientIP(client));
                    azure_blobs.getList(config.blob_containers.pending)
                        .then(function(ack){
                            var blobs = [];
                            ack.entries.forEach(function(item){
                                blobs.push({ 
                                    url : azure_blobs.getBlobUrl(config.blob_containers.pending, item.name),
                                    type : item.properties['content-type'],
                                    uploaded : new Date(item.properties['last-modified']).getTime(),
                                    name: item.name
                                });
                            });
                            //sort blobs by date DESC
                            blobs.sort(function(a, b){
                                return b.uploaded - a.uploaded;
                            });
                            client.send({ pending_blobs : blobs });
                        })
                        .fail(function(error){
                            logMessage('Faield to retriev pending blobs from azure: ' + JSON.stringify(error));
                        });
                }
                else{
                    client.send({ error : 'authorization required'});
                }
                break;
                /**
                 * Moves blob from pending container to active container based on the URI in pending container
                 */
            case 'activate_blob':
                if(client_authenticated){
                    client.send({ activation_result : 'success'});
                }
                else{
                    client.send({ error : 'authorization required'});
                }
                break;
                break;
      }
  }); 
});

// Create a http server for dynamic html generation which inclues Open Graph
// meta tags for facebook

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    var queryObject = url.parse(req.url,true).query;
    var image_location = azure_blobs.getBlobUrl(config.blob_containers.active, queryObject.name);
    var html = "";
    if(queryObject.name.indexOf(".mp4") == -1){
        html = ['<!DOCTYPE html>',
                    '<html>',
                        '<head>',
                            '<title>Cloud images</title>',
                            '<meta charset="UTF-8">',
                            '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
                            '<meta property="og:description" content="This image was shared via http://your.domain.com" />',
                            '<meta property="og:image" content="' + image_location + '" />',
                            '<meta property="og:url" content="http://your.domain.com/share/' + queryObject.name + '" />',
                        '</head>',
                        '<body>',
                            '<img src="' + image_location + '" />',
                        '</body>',
                    '</html>'].join('');
        logMessage('Image ' + image_location + ' opened via share link');
    }
    else{
        html = ['<!DOCTYPE html>',
                    '<html>',
                        '<head>',
                            '<title>Cloud images</title>',
                            '<meta charset="UTF-8">',
                            '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
                            '<meta property="og:description" content="This video was shared via http://your.domain.com" />',
                            '<meta property="og:url" content="http://your.domain.com/share/' + queryObject.name + '" />',
                        '</head>',
                        '<body>',
                            '<video autobuffer controls>',
                                '<source src="' + image_location + '" type="video/mp4"></source>',
                            '/video>',
                        '</body>',
                    '</html>'].join('');
        logMessage('Video ' + image_location + ' opened via share link');
    }
    res.end(html);
}).listen(3000, "127.0.0.1");

logMessage('Azure proxy started!');
