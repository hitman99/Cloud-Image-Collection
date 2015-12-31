Hitman's Cloud Image Collection
==

About
--

Hitman's cloud image collection is an out of the box solution for the image library you were thinking of having since forever. Remember that funny picture that you saw in somewhere on the internet and thought to yourself - well, that is freaking funny. Then you saved it on your desktop for later use and reinstalled your OS... And when a situation comes around where you want to use that funny picture, you cannot because you lost it forever. Well, with this library - this will no longer be the case. Save it in the cloud and forget it until you need to use the picture again!

Features
--

  + Upload pictures from laptops, desktops or modern mobile phones
  + Password protected upload page
  + Grab images from URLs and store them in the cloud
  + Video support
  + Facebook share and copy link buttons for each image/video
  + Lazy loading
  + Stores images and videos in the Microsoft Azure blob storage

Installation
--

This software runs on NodeJS and Nginx (for static content serving). You ned to execute the following steps in order to star the azure-proxy

```sh
npm install azure-storage
npm install q
npm install binaryjs
```

Then, configure your WS served link in azure-blob-admin.js and azure-images.js
```javascript
server_address: 'ws://your.domain.com:1234'
```
Once you completed this, it is time to configure the azure-proxy itself. In configs directory there is an  example of configuration app-config-example.js. Please copy this file and rename to app-config.js so the azure-proxy could use it. Inside, you need to configure the following things:
```javascript
module.exports = {
    blob_storage_key : 'your azure key', // put your azure blob storate access key here. You need to have publicly available blobs configured.
    azure_proxy_port : 1234, // port on which the WS server will be listening for connections
    auth_tokens : [ // here are the users which will be able to login and upload images
        {
            user: 'user1',
            password: 'password1'
        },
        {
            user: 'user2',
            password: 'pasword2'
        }
    ],
    logs : { // logs
        access : 'logs/azure-proxy-access.log'
    },
    // this configuration should be the same for active and pending as for now. 
    // these are placeholders for the future when the uploaded image valiadation will be implemented.
    blob_containers: {
        active: 'images-active',
        pending: 'images-active'
    },
    check_auth : function(user, password){
        for(var i = 0; i < this.auth_tokens.length; i++){
            if(this.auth_tokens[i].user == user &&
               this.auth_tokens[i].password == password){
               return true;
            }
        }
        return false;
    }
}
```

Azure cloud custom domain - if you configured one, define it in azure-blobs.js. If not, set it to null.
```javascript
customDomain : 'http://your-azure-domain.com'
```

This is it, cloud image library is fully configured now.

Starting, stopping and restarting
---
The cloud image library is designed to be running in the background. There are 3 sh scripts provided for your convenience to operate this pieace of software.

+ start_proxy.sh
+ stop_proxy.sh
+ restart_proxy.sh


Demo
---
You can check the working example at http://img.hitman.lt

Known issues
---
There is a video overflow issue on mobile devices. Larger videos may appear cropped.

License
--
You are free to change this software as you like :)
[GPLv3](http://www.gnu.org/licenses/gpl.html)
