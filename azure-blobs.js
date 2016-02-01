var azure = require('azure-storage');
var config = require('./configs/app-config.js');
var blobSvc = azure.createBlobService(config.blob_storage_key);
var Q = require('q');

module.exports = {
    /**
     * uploads image to azure blob storage
     * @returns Q.promise
     */
    upload : function(filename, container_name, blob_name, meta_info){
        var deferred = Q.defer();
        blobSvc.createBlockBlobFromLocalFile(container_name, blob_name, filename, { metadata: meta_info }, function(error, result, response){
            console.log(result);
            if(!error){
                deferred.resolve(response);
            }
            else{
                deferred.reject(error);
            }
        });
        return deferred.promise;
    },
    getList : function(container_name) {
        var deferred = Q.defer();
        blobSvc.listBlobsSegmented(container_name, null, { include : 'metadata' }, function(error, result, response){
            if(!error){
                deferred.resolve(result);
            }
            else{
                deferred.reject(error);
            }
        });
        return deferred.promise;
    },
    getBlobUrl : function(container_name, blob_name){
        if(this.customDomain){
            return this.customDomain + '/' + container_name + '/' + blob_name;
        }
        else{
            return blobSvc.getUrl(container_name, blob_name);
        }
    },
    customDomain : 'http://your-azure-domain.com'
}
