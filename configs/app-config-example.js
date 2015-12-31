module.exports = {
    blob_storage_key : 'your azure key',
    azure_proxy_port : 1234,
    auth_tokens : [
        {
            user: 'user1',
            password: 'password1'
        },
        {
            user: 'user2',
            password: 'pasword2'
        }
    ],
    logs : {
        access : 'logs/azure-proxy-access.log'
    },
    blob_containers: {
        active: 'images-active',
        pending: 'images-pending'
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