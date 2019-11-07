var fileInput = document.getElementById('myfile');
var fReader = new FileReader();

function GetRepoFiles(repo) {
    repo = document.getElementById('repoURL').value
    masterURL = 'https://api.github.com/repos/' + repo + '/branches/master'
    var lastCommitReq = new XMLHttpRequest();
    lastCommitReq.open("GET", masterURL, true);
    lastCommitReq.responseType = "json";
    lastCommitReq.onload = function(oEvent) {
        var obj = lastCommitReq.response;
        console.log('received json for last commit')
        treeURL=obj["commit"]["commit"]["tree"]["url"]
        console.log(treeURL)

        var fileTreeReq = new XMLHttpRequest();
        fileTreeReq.open("GET", treeURL, true);
        fileTreeReq.responseType = "json";
        fileTreeReq.onload = function(oEvent) {
            var obj = fileTreeReq.response;
            console.log('received json for tree')
            treeObject = obj["tree"]
            console.log(treeObject)
            itemList = BuildItemList(treeObject,'',repo)
            console.log('item list')
            console.log(itemList)
        };
        console.log('Sending Request for file list to: ' + masterURL)
        fileTreeReq.send();
    };
    console.log('Sending Request for last commit to: ' + masterURL)
    lastCommitReq.send();
}

function GetFolderContents(target) {
    var req = new XMLHttpRequest();
    req.open("GET", target, true);
    req.responseType = "json";
    req.onload = function(oEvent) {
        console.log('received tree json')
        var obj = req.response;
        treeObject = obj["tree"]
        console.log(treeObject)
    };
    console.log('Sending Request to: ' + target)
    req.send();
}

function ShowRateLimit() {
    var req = new XMLHttpRequest();
    req.open("GET", 'https://api.github.com/rate_limit', true);
    req.responseType = "json";
    req.onload = function(oEvent) {
        console.log('Rate Limit')
        var obj = req.response;
        console.log(obj)
    };
    console.log('Sending Rate Limit Request')
    req.send();
}

function BuildItemList(treeObject, Directory, Repo) {
    newArray = []
    document.getElementById('debugResultBox').innerHTML += '<h3>Repo Wrapper: '+ Repo +'</h3><ul>'
    treeObject.forEach(function(item,index) {
        //is it an image
        if (item["type"]=='blob' && (item["path"].toUpperCase().includes('.JPG') || item["path"].toUpperCase().includes('.PNG'))) {
            title = item["path"]
            repoPath = Directory + '/' + item["path"]
            URL = 'https://raw.githubusercontent.com/' + Repo + '/master/'+repoPath
            item = {Type: "Image", Title:title, Subtitle:'', Directory: Directory, URL: URL }
            newArray.push(item)

            document.getElementById('debugResultBox').innerHTML += '<li>'+item["Type"]+': ' +item["Title"]+ ', URL: '+item["URL"]+'</li>'
        }
        if (item["type"]=='tree'){
            title = item["path"]
            repoPath = Directory + '/' + item["path"]
            URL = item['url']
            item = {Type: "Folder", Title:title, Subtitle:'', Directory: Directory, URL: URL }
            newArray.push(item)

            document.getElementById('debugResultBox').innerHTML += '<li>'+item["Type"]+': ' +item["Title"]+', API URL: '+item["URL"]+'</li>'
        }
    })
    document.getElementById('debugResultBox').innerHTML += '</ul>'
    return newArray
}

function LoadIndex() {
    file = document.getElementById('repoURL').value
    if (file.indexOf('https://')<0) {file = 'https://' + file}
    //file = 'https://raw.githubusercontent.com/michaeldowd2/Wikiart_tSNE/master/index'
    //file = 'https://bitbucket.org/shaventiger/websuits/raw/06afafb05a2e0f6ea052cf006e3e627f78e2b255/Website/index'
    var oReq = new XMLHttpRequest();
    oReq.open("GET", file, true);
    oReq.responseType = "blob";

    oReq.onload = function(oEvent) {
        var blob = oReq.response;
        console.log('received blob')
        fReader.readAsArrayBuffer(blob);
        fReader.addEventListener("loadend", function(e)
        {
            console.log('loaded blob')
            arr = new Uint8Array(e.target.result);
            var asciiDec = new TextDecoder("ascii");
            var s = 0
            var e = 4
            var ind = {}
            ind['signature']=asciiDec.decode(arr.slice(s,e))
            ind['version']=intFromBytes(arr.slice(s=s+4,e=e+4))
            ind['entries']=intFromBytes(arr.slice(s=s+4,e=e+4))
            document.getElementById('debugResultBox').innerHTML = 'Git Index Version: ' + ind['version'] + '<ul>'
            //console.log(ind)
            var entries= []
            for (n = 0; n < ind['entries']; n++) {
            	var entry = {}
                entry["entry"] = n + 1
                len=intFromBytes(arr.slice(s=s+64,e=e+62))
                entry["name"] =asciiDec.decode(arr.slice(s=s+2,e=e+len))
                mod = e%8
                if ((8-mod) <= mod) { pad = 8-mod }
                else { pad = -mod }
                s=e+pad
                e=s+4
                //console.log(entry)
                document.getElementById('debugResultBox').innerHTML += '<li>'+entry["name"]+'</li>'
                entries.push(entry["name"])
            }
            ind["entries"]=entries
            document.getElementById('debugResultBox').innerHTML += '</ul>'
            document.getElementById('debugResultBox').innerHTML += window.location.href
            //console.log(ind)
        });
    };
    console.log('Sending Request to: ' + file)
    oReq.send();
}

function intFromBytes( x ){
    var val = 0;
    for (var i = 0; i < x.length; ++i) {        
        val += x[i];        
        if (i < x.length-1) {
            val = val << 8;
        }
    }
    return val;
}
    