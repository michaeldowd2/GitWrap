function getRepoFromBox() {
    userRepo = document.getElementById('repoBox').value;
    newURL = window.location.href+'?Repo=' +userRepo
    window.location.href= newURL
}

function getJsonFromUrl(url) {
    if(!url) url = location.href;
    var question = url.indexOf("?");
    var hash = url.indexOf("#");
    if(hash==-1 && question==-1) return {};
    if(hash==-1) hash = url.length;
    var query = question==-1 || hash==question+1 ? url.substring(hash) : 
    url.substring(question+1,hash);
    var result = {};
    query.split("&").forEach(function(part) {
      if(!part) return;
      part = part.split("+").join(" "); // replace every + with space, regexp-free version
      var eq = part.indexOf("=");
      var key = eq>-1 ? part.substr(0,eq) : part;
      var val = eq>-1 ? decodeURIComponent(part.substr(eq+1)) : "";
      var from = key.indexOf("[");
      if(from==-1) result[decodeURIComponent(key)] = val;
      else {
            var to = key.indexOf("]",from);
            var index = decodeURIComponent(key.substring(from+1,to));
            key = decodeURIComponent(key.substring(0,from));
            if(!result[key]) result[key] = [];
            if(!index) result[key].push(val);
            else result[key][index] = val;
        }
    });
    return result['Repo'];
}

function BuildItemList(treeObject, Directory, Repo) {
    newArray = []
    treeObject.forEach(function(item,index) {
        //is it an image
        if (item["type"]=='blob' && (item["path"].toUpperCase().includes('.JPG') || item["path"].toUpperCase().includes('.PNG'))) {
            title = item["path"]
            repoPath = Directory + '/' + item["path"]
            URL = 'https://raw.githubusercontent.com/' + Repo + '/master'+repoPath
            item = {Type: "Image", Title:title, Subtitle:'', Directory: repoPath, URL: URL }
            newArray.push(item)
         }
        if (item["type"]=='tree'){
            title = item["path"]
            repoPath = Directory + '/' + item["path"]
            URL = item['url']
            item = {Type: "Folder", Title:title, Subtitle:'', Directory: repoPath, URL: URL }
            newArray.push(item)

        }
    })
    return newArray
}

function AddFolder(Repo, Container, Item) {
    console.log('adding folder')
    Container.innerHTML += '<div class="itemBox" onclick=\'GetFolderContents("'+REPO+'","'+Item.Directory+'","'+Item.URL+'")\'>'+Item.Type+': ' +Item.Title+': '+Item.Directory+'</div>'
}

function AddImage(Repo, Container, Item) {
    console.log('adding image')
    Container.innerHTML += '<img src="'+Item.URL+'" alt="'+Item.Title + '">'
}

function LoadItemsToPage(Repo, ItemList) {
    console.log('Loading Items to Page')
    console.log(ItemList)
    container = document.getElementById('content')
    container.innerHTML = '<h1>'+Repo+'</h1>'
    ItemList.forEach(function(item,index) {
        if (item.Type==='Image'&&item.Title.includes('Summary')) {AddImage(Repo,container,item);}
        else if (item["Type"]=='Folder') {AddFolder(Repo,container,item);}
    })
}

function GetRepoFiles(Repo) {
    masterURL = 'https://api.github.com/repos/' + Repo + '/branches/master'
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
            itemList = BuildItemList(treeObject,'',Repo)
            LoadItemsToPage(Repo,itemList)
            return;
        };
        console.log('Sending Request for file list to: ' + masterURL)
        fileTreeReq.send();
    };
console.log('Sending Request for last commit to: ' + masterURL)
lastCommitReq.send();
};

function GetFolderContents(Repo, Directory, target) {
    var req = new XMLHttpRequest();
    req.open("GET", target, true);
    req.responseType = "json";
    req.onload = function(oEvent) {
        console.log('received tree json')
        var obj = req.response;
        treeObject = obj["tree"]
        itemList = BuildItemList(treeObject,Directory,Repo)
        LoadItemsToPage(Repo,itemList)

    };
    console.log('Sending Request to: ' + target)
    req.send();
};

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

function LoadFromParams() {
    urlRepo = getJsonFromUrl()
    if (!jQuery.isEmptyObject(urlRepo)) {REPO=urlRepo;}
    if (REPO!=='') {
        console.log('Repo: ' + REPO)
        document.getElementById('loadBox').style.display = "none";
        GetRepoFiles(REPO)
    }
    else { //Showing the site generator
        document.getElementById('content').style.display = "none";
    }
}