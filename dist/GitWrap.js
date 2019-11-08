var SiteTree = {};
var JustRepo = '';
var TopPath = '';
var CurrentPath = '';



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
    if (!jQuery.isEmptyObject(result.Repo)) {REPO=result.Repo;}
    if (!jQuery.isEmptyObject(result.Path)) {CurrentPath=result.Path;}
    else {CurrentPath='';}
    console.log('Repo from URL: ' + REPO)
    console.log('Current Path from URL: ' + CurrentPath)
    return result['Repo'];
}

function BuildSiteTree(TreeObject) {
    TreeObject.forEach(function(item,index) {
        if (TopPath ==='' || item.path.indexOf(TopPath===0)){
            //is it an image
            if (item["type"]=='blob' && (item["path"].toUpperCase().includes('.JPG') || item["path"].toUpperCase().includes('.PNG'))) {
                title = item.path.substring(item.path.lastIndexOf('/'))
                URL = 'https://raw.githubusercontent.com/' + JustRepo + '/master/'+item.path
                newItem = {Type: "Image", Title:title, Subtitle:'', Path: item.path, URL: URL }
                SiteTree[item.path]=newItem
             }
            if (item["type"]=='tree'){
                title = item.path.substring(item.path.lastIndexOf('/'))
                URL = item['url']
                newItem = {Type: "Folder", Title:title, Subtitle:'', Path:item.path+'/', URL: URL }
                SiteTree[item.path]=newItem
            }
        }
    })
}

function AddFolder(Container, Item) {
    Container.innerHTML += '<div class="itemBox" onclick=\'LoadItemsFromPathLink("'+Item.Path+'")\'>'+Item.Type+': ' +Item.Title+'</div>'
}

function AddImage(Container, Item) {
    Container.innerHTML += '<img src="'+Item.URL+'" alt="'+Item.Title + '">'
}

function LoadItemsFromPathLink(Path){
    CurrentPath = Path;
    LoadItemsToPage();
}

function LoadItemsToPage(Push=true,Replace=false) {
    if (CurrentPath!==''){
        newURL= window.location.href + '&Path='+CurrentPath
        if (Push) {history.pushState('','',newURL)}
        else if (Replace) {history.replaceState('','',newURL)}
    }
    
    console.log('Loading Items to Page for Path: ' + CurrentPath)

    container = document.getElementById('content')
    container.innerHTML = ''

    Object.keys(SiteTree).forEach(function(key) {
        if ((CurrentPath==='' && key.indexOf('/')<0) //top level item
        || (key.indexOf(CurrentPath)===0 && key.substring(CurrentPath.length).indexOf('/')<0)) {
            item = SiteTree[key];
            if (item.Type==='Image'&&item.Title.includes('Summary')) {AddImage(container,item);}
            else if (item["Type"]=='Folder') {AddFolder(container,item);}
        }
    })
}

function GetRepoFiles(Repo) {
    JustRepo = Repo
    repoArray = Repo.split('/')
    if ((repoArray.length - 1) >2 ) { //Contains a path also
        JustRepo = repoArray[0]+'/' +repoArray[1]
        for (i = 2; i < repoArray.length; i++) {
            TopPath += repoArray[i] + "<br>";
        }
    }
    console.log('JustRepo: '+JustRepo)
    console.log('TopPath: ' + TopPath)

    masterURL = 'https://api.github.com/repos/' + JustRepo + '/branches/master'

    var lastCommitReq = new XMLHttpRequest();
    lastCommitReq.open("GET", masterURL, true);
    lastCommitReq.responseType = "json";
    lastCommitReq.onload = function(oEvent) {
        var obj = lastCommitReq.response;
        //console.log('received json for last commit')
        treeURL=obj["commit"]["commit"]["tree"]["url"] + '?recursive=1'
        //console.log(treeURL)

        var fileTreeReq = new XMLHttpRequest();
        fileTreeReq.open("GET", treeURL, true);
        fileTreeReq.responseType = "json";
        fileTreeReq.onload = function(oEvent) {
            var obj = fileTreeReq.response;
            console.log('received json for tree')
            treeObject = obj["tree"]
            //console.log(treeObject)
            BuildSiteTree(treeObject)
            console.log('SiteTree')
            console.log(SiteTree)
            LoadItemsToPage(Push=false, Replace=true)
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

function LoadPageTemplate() {
    document.getElementsByClassName('navBar').innerHTML='<h1>'+REPO+'</h1>'
}

function LoadFromParams() {
    getJsonFromUrl()
    if (REPO!=='') {
        console.log('Repo: ' + REPO)
        document.getElementById('loadBox').style.display = "none";
        LoadPageTemplate()
        GetRepoFiles(REPO)
    }
    else { //Showing the site generator
        document.getElementById('content').style.display = "none";
    }
}

window.onpopstate = function (event) {
    console.log('popping, calling loadfromparams for')
    console.log(window.location.href)
    getJsonFromUrl()
    LoadItemsToPage(Push=false,Replace=false)

};