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

function ParseTargetFromTitle(Title) {
    ind = Title.indexOf('[Target=')
    if (ind>=0) {
        part = Title.substring(ind)
        end = part.indexOf(']')
        if (end>0) {
            target=part.substring(0,end).toUpperCase()
            if (target=== 'GALLERY'
            || target === 'LINKS'
            || target === 'HTML') {return target;}
        }
    }
    return null;
}

function ParseTitleAndSubtitle(Title, Item) {
    part = Title;
    ind = Title.indexOf('[')
    if (ind>0) { part = part.subString(0,ind);}
    parts = part.split('_')
    Item["Title"] = parts[0]
    if (parts.length>1) Item["Subtitle"] = parts[1]
    return Item;
}

function BuildSiteTree(TreeObject) {
    TreeObject.forEach(function(item,index) {
        if (TopPath ==='' || item.path.indexOf(TopPath===0)){
            //is it an image
            if (item["type"]=='blob' && (item["path"].toUpperCase().includes('.JPG') || item["path"].toUpperCase().includes('.PNG'))) {
                title = item.path.substring(item.path.lastIndexOf('/'))
                URL = 'https://raw.githubusercontent.com/' + JustRepo + '/master/'+item.path
                target = ParseTargetFromTitle(title);
                if (target===null) {target='GALLERY';}
                newItem = {Type: "Image", Title:title, Subtitle:'', Path: item.path, URL: URL }
                SiteTree[item.path]=newItem
            }
            else if (item["type"]=='blob' && (item["path"].toUpperCase().includes('.MP3'))) {
                title = item.path.substring(item.path.lastIndexOf('/'))
                target = ParseTargetFromTitle(title);
                if (target===null) {target='GALLERY';}
                URL = 'https://raw.githubusercontent.com/' + JustRepo + '/master/'+item.path
                newItem = {Type: "Audio", Title:title, Subtitle:'', Path: item.path, URL: URL }
                SiteTree[item.path]=newItem
            }
            else if (item["type"]=='tree'){
                title = item.path.substring(item.path.lastIndexOf('/'))
                target = ParseTargetFromTitle(title);
                if (target===null) {target='GALLERY';}
                URL = item['url']
                newItem = {Type: "Folder", Path:item.path+'/', URL: URL }
                newItem = ParseTitleAndSubtitle(title,newItem);
                SiteTree[item.path]=newItem
            }
        }
    })
}

function AddFolder(Container, Item) {
    Container.innerHTML += '<div class="grid-item col-lg-4 col-md-6 col-sm-12" onclick=\'LoadItemsFromPathLink("'+Item.Path+'")\'><div class="paletteColour1"><h1>'+Item.Title+'</h1><p class="font-weight-light">'+Item.Subtitle+'</p></div></div>'
}

function AddImage(Container, Item) {
    Container.innerHTML += '<div class="grid-item col-lg-4 col-md-6 col-sm-12"><img style="width:100%;height:100%"src="'+Item.URL+'" alt="'+Item.Title + '"></div>'
}

function AddAudio(Container, Item) {
    console.log('adding audio: ') + URL
    Container.innerHTML += '<div class="grid-item col-lg-4 col-md-6 col-sm-12">'+Item.Title+'<audio controls><source src="'+ Item.URL+'" type="audio/mpeg">Your browser does not support the audio element</audio></div>'
}

function LoadItemsFromPathLink(Path){
    CurrentPath = Path;
    LoadItemsToPage();
}

function RefreshMasonry() {
    imagesLoaded( '.grid', function( instance ) {
        var msnry = new Masonry( '.grid', {
            itemSelector: '.grid-item'
        });
    });
}

function LoadItemsToPage(Push=true,Replace=false) {
    if (CurrentPath!==''){
        newURL= window.location.href + '&Path='+CurrentPath
        if (Push) {history.pushState('','',newURL)}
        else if (Replace) {history.replaceState('','',newURL)}
    }
    
    htmlRender = document.getElementsByClassName('htmlRender')[0]
    htmlRender.innerHTML = ''
    linkRender = document.getElementsByClassName('linkRender')[0]
    linkRender.innerHTML = ''
    galleryRender = document.getElementsByClassName('galleryRender')[0]
    galleryRender.innerHTML = ''

    Object.keys(SiteTree).forEach(function(key) {
        if ((CurrentPath==='' && key.indexOf('/')<0) //top level item
        || (key.indexOf(CurrentPath)===0 && key.substring(CurrentPath.length).indexOf('/')<0)) {
            item = SiteTree[key];
            targetContainer = galleryRender
            if (item.Target==='HTML') {target = htmlRender;}
            else if (item.Target==='LINKS') {target = linksRender;}
            else if (item.Target==='GALLERY') {target = galleryRender;}

            if (item.Type==='Image') {AddImage(targetContainer,item);}
            else if (item["Type"]=='Folder') {AddFolder(targetContainer,item);}
            else if (item["Type"]=='Audio') {AddAudio(targetContainer,item);}
        }
    })
    RefreshMasonry()
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

    masterURL = 'https://api.github.com/repos/' + JustRepo + '/branches/master'

    var lastCommitReq = new XMLHttpRequest();
    lastCommitReq.open("GET", masterURL, true);
    lastCommitReq.responseType = "json";
    lastCommitReq.onload = function(oEvent) {
        var obj = lastCommitReq.response;
        treeURL=obj["commit"]["commit"]["tree"]["url"] + '?recursive=1'
        var fileTreeReq = new XMLHttpRequest();
        fileTreeReq.open("GET", treeURL, true);
        fileTreeReq.responseType = "json";
        fileTreeReq.onload = function(oEvent) {
            var obj = fileTreeReq.response;
            console.log('received json for tree')
            treeObject = obj["tree"]
            BuildSiteTree(treeObject)
            console.log('SiteTree')
            console.log(SiteTree)
            LoadItemsToPage(Push=false, Replace=true)
            return;
        };
        fileTreeReq.send();
    };
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
        var obj = req.response;
        console.log(obj)
    };
    console.log('Sending Rate Limit Request')
    req.send();
}

function LoadPageTemplate() {
    console.log('loading brand')
    title = REPO.substring(REPO.indexOf('/')+1)
    titleEl = document.getElementsByClassName('navbar-brand')[0]
    titleEl.innerHTML=title
    titleEl.setAttribute('href',window.location.href)
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
    getJsonFromUrl()
    LoadItemsToPage(Push=false,Replace=false)

};