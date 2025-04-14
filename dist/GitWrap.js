var SiteTree = {};
var JustRepo = '';
var TopPath = '';
var CurrentPath = '';
var TotalItems = 0;
var CurrentItems = 0;

function createURL() {
    userRepo = document.getElementById('name_inp').value + '/' +
               document.getElementById('repo_inp').value 
    path = document.getElementById('fold_inp').value 
    if (path !== '') {
        if (path[path.length-1] !== '/') { path += '/'; }
        userRepo += '/' + path
    }
    newURL = window.location.href + '?Repo=' + userRepo

    //store site title in URL
    title = document.getElementById('site_title_input').value
    if (title != '') {
        newURL += '&Title=' + title.replaceAll(' ', '+');
    }

    link_method = document.getElementById('site_link_method').value
    if (link_method != '') {
        newURL += '&LM=' + link_method;
    }

    newURL += '&TS=' + EncodeThemeFromUI()

    window.location.href= newURL
}

function GetDefaultTheme() {
    return '0'
}

function EncodeThemeFromUI() {
    let themestring = '';
    let brand_font = document.getElementById('site_brand_font').value;
    let bg_gradient = document.getElementById('site_bg_gradient').value;
    let corner_radius = document.getElementById('site_corner_radius').value;
    let palette_gradient = document.getElementById('palette_gradient').value;
    // Format: brand|bg|radius|palette
    themestring += brand_font + '|' + bg_gradient + '|' + corner_radius + '|' + palette_gradient;
    return themestring;
}

function DecodeThemeFromUI(theme_string) {
    let theme = {};
    let parts = theme_string.split('|');
    theme['brand_font_class'] = 'brand_' + (parts[0] || '0');
    theme['bg_gradient'] = parts[1] || 'lightblue';
    theme['corner_radius'] = parts[2] || 'medium';
    theme['palette_gradient'] = parts[3] || 'darkgray';
    return theme;
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
    //if (!jQuery.isEmptyObject(result.Repo)) {REPO=result.Repo;}
    if (!jQuery.isEmptyObject(result.Path)) {CurrentPath=result.Path;}
    else { CurrentPath = ''; }
    var TS = GetDefaultTheme()
    if ('TS' in result) {
        TS = result['TS']
    }
    result['Theme'] = DecodeThemeFromUI(TS)
    return result;
}

function ParseTargetFromTitle(Title) {
    ind = Title.indexOf('[Target=')
    if (ind>=0) {
        part = Title.substring(ind+8)
        end = part.indexOf(']')
        if (end>0) {
            target=part.substring(0,end).toUpperCase()
            console.log('target: '+target)
            if (target==='GALLERY' || target==='LINKS' || target==='PAGE' || target==='BANNER') {
                return target;
            }
        }
    }
    return null;
}

function ParseTitleAndSubtitle(Title, Item) {
    part = Title;
    ind = Title.indexOf('[')
    if (ind>0) { part = part.substring(0,ind);}
    parts = part.split('_')
    title = parts[0]
    var titleExtInd = title.indexOf('.')
    if (titleExtInd>0) {title = title.substring(0,titleExtInd);}
    Item["Title"] = title
    Item["Subtitle"]='';
    if (parts.length>1) {
        subTitle = parts[1]
        var subExtInd = parts[1].indexOf('.')
        if (subExtInd > 0) {subTitle = subTitle.substring(0,subExtInd);}
        Item["Subtitle"] = subTitle
    }
    return Item;
}

function BuildSiteTree(tree_object, folder_target) {
    tree_object.forEach(function(item,index) {
        if (TopPath ==='' || item.path.indexOf(TopPath)===0){
            //URL
            url = item['url']
            if (item["type"]=='blob') {
                URL = 'https://raw.githubusercontent.com/' + JustRepo + '/master/'+item.path
            }
            title = item.path.substring(item.path.lastIndexOf('/')+1)
            target = ParseTargetFromTitle(title); 
            newItem = null;
            if (item["type"]=='blob' && (item["path"].toUpperCase().includes('.JPG') || item["path"].toUpperCase().includes('.PNG'))) {                
                if (target===null) {target='GALLERY';}
                newItem = {Type: "Image", Path: item.path, URL: URL, Target:target }
            }
            else if (item["type"]=='blob' && (item["path"].toUpperCase().includes('.MP3'))) {
                if (target===null) {target='GALLERY';}
                newItem = {Type: "Audio", Path: item.path, URL: URL, Target:target }
            }
            else if (item["type"]=='blob' && (item["path"].toUpperCase().includes('.HTML')) && !item["path"].toUpperCase().includes('INDEX.HTML')) {
                if (target===null) {target='PAGE';}
                newItem = {Type: "Html", Path: item.path, URL: URL, Target:target }
            }
            else if (item["type"]=='blob' && item["path"].toUpperCase().includes('.URL')) {
                if (target === null) { target = folder_target;}
                newItem = {Type: "Url", Path: item.path, URL: URL, Target:target }
            }
            else if (item["type"]=='tree'){
                if (target === null) { target = folder_target;}
                newItem = {Type: "Folder", Path:item.path+'/', URL: URL, Target:target }
            }
            if (newItem!==null) {
                newItem = ParseTitleAndSubtitle(title,newItem);
                SiteTree[item.path]=newItem;
            }
        }
    })
}

function AddBannerImage(Container, Item) {
    html = `<div class="carousel-item active">
                <img src="`+Item.URL+`" class="d-block w-100" alt="`+Item.Title+`">
                <div class="carousel-caption d-none d-md-block">
                    <h5>`+Item.Title+`</h5>
                    <p>`+Item.Subtitle+`</p>
                </div>
            </div>`
    Container.innerHTML += html;
    CheckItemCountAndRefreshMasonry()
}

function AddHTML(Container, Item) {
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4) {
            response = 'Page Not Found'
            if (this.status == 200) {
                response = this.responseText
            }
            Container.innerHTML +=
            `<div class = "col-lg-12 col-md-12 col-sm-12">
                <h1>` + Item.Title + `</h1>
                <small ">` + Item.Subtitle + `</small>
                <hr>` +
                response + 
            `</div>`
            CheckItemCountAndRefreshMasonry()
        }
    }
    xhttp.open("GET", Item.URL, true);
    xhttp.send();
    return;
}

function AddURL(Container, Item, RefreshMasonry) {
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4) {
            response = 'URL not found'
            if (this.status == 200) {
                response = this.responseText.replace("URL:","")
            }
            Container.innerHTML +=
            `<div class = "grid-item clickable col-lg-4 col-md-6 col-sm-12 animated fadeIn">
                <div class = "paletteColour1" onclick="window.location='` + response + `';">
                    <h1>` + Item.Title + `</h1>
                    <small>` + Item.Subtitle + `</small>
                </div>
            </div>`
            CheckItemCountAndRefreshMasonry()
        }
    }
    xhttp.open("GET", Item.URL, true);
    xhttp.send();
    return;
}

function AddFolder(Container, Item, RefreshMasonry) {
    Container.innerHTML += 
    `<div class = "grid-item clickable col-lg-4 col-md-6 col-sm-12 animated fadeIn" onclick = \'LoadItemsFromPathLink("`+Item.Path+`")\'>
        <div class = "paletteColour1">
            <h1>` + Item.Title + `</h1>
            <small>` + Item.Subtitle + `</small>
        </div>
    </div>`
    CheckItemCountAndRefreshMasonry()
}

function AddImage(Container, Item, RefreshMasonry) {
    Container.innerHTML += 
    `<div class = "grid-item col-lg-4 col-md-6 col-sm-12">
        <img style = "width: 100%; height: 100%" src = "` + Item.URL + `" alt="` + Item.Title + `">
    </div>`
    CheckItemCountAndRefreshMasonry()
}

function AddAudio(Container, Item, RefreshMasonry) {
    Container.innerHTML += `
    <div class = "grid-item animated fadeIn col-lg-4 col-md-6 col-sm-12">
        <div class = "col-sm-12">
            <h5>` + Item.Title + `</p>
        </div>
        <div class = "col-sm-12">
            <audio controls>
                <source src = "` + Item.URL + `" type = "audio/mpeg">
                Your browser does not support the audio element
            </audio>
        </div>
     </div>`
     CheckItemCountAndRefreshMasonry()
}

function LoadItemsFromPathLink(Path){
    CurrentPath = Path;
    LoadItemsToPage();
    if (CurrentTheme) {
        ApplyTheme(CurrentTheme);
    }
}

function RefreshMasonry() {
    imagesLoaded( '.grid', function( instance ) {
        var msnry = new Masonry( '.grid', {
            itemSelector: '.grid-item'
        });
    });
}

function LoadItemsToPage(Push=true,Replace=false) {
    if (CurrentTheme) {
        ApplyTheme(CurrentTheme);
    }
    if (CurrentPath !== '') {
        let url = window.location.href;
        let pathRegex = /([&?])Path=[^&]*/;
        let hasPath = pathRegex.test(url);
        let sep = url.indexOf('?') === -1 ? '?' : '&';
        if (hasPath) {
            // Replace existing Path param
            url = url.replace(pathRegex, '$1Path=' + encodeURIComponent(CurrentPath));
        } else {
            // Append Path param
            url = url + sep + 'Path=' + encodeURIComponent(CurrentPath);
        }
        if (Push) {
            history.pushState('', '', url);
        } else if (Replace) {
            history.replaceState('', '', url);
        }
    }
    
    bannerRender = document.getElementsByClassName('carousel-inner')[0]
    bannerRender.innerHTML = ''
    pageRender = document.getElementsByClassName('pageRender')[0]
    pageRender.innerHTML = ''
    linkRender = document.getElementsByClassName('linkRender')[0]
    linkRender.innerHTML = ''
    galleryRender = document.getElementsByClassName('galleryRender')[0]
    galleryRender.innerHTML = ''

    CountGalleryItemsForCurrentPath()

    Object.keys(SiteTree).forEach(function(key) {
        if ((CurrentPath === '' && key.indexOf('/')<0) //top level item
        || (key.indexOf(CurrentPath)===0 && key.substring(CurrentPath.length).indexOf('/')<0)) {
            
            refreshMasonry = false
            item = SiteTree[key];
            targetContainer = galleryRender
            if (item.Target==='LINKS') {targetContainer = linksRender;}
            else if (item.Target==='BANNER') {targetContainer = bannerRender;}
            else if (item.Target==='PAGE') { targetContainer = pageRender; }

            if (item.Target==='BANNER' && item.Type==='Image') {AddBannerImage(targetContainer,item);}
            else if (item.Type==='Image') {AddImage(targetContainer, item);}
            else if (item["Type"]=='Folder') {AddFolder(targetContainer, item);}
            else if (item["Type"]=='Audio') {AddAudio(targetContainer, item);}
            else if (item["Type"]=='Html') {AddHTML(targetContainer, item);}
            else if (item["Type"]=='Url') {AddURL(targetContainer, item);}
        }
    })
}

function CountGalleryItemsForCurrentPath() {
    TotalItems = 0
    CurrentItems = 0
    Object.keys(SiteTree).forEach(function(key) {
        if ((CurrentPath==='' && key.indexOf('/')<0) //top level item
        || (key.indexOf(CurrentPath)===0 && key.substring(CurrentPath.length).indexOf('/')<0)) {
            TotalItems += 1;
        }
    })
}

function CheckItemCountAndRefreshMasonry() {
    CurrentItems += 1
    if (CurrentItems === TotalItems) {
        RefreshMasonry()
    }
}

function GetRepoFiles(repo, folder_target) {
    JustRepo = repo
    repoArray = repo.split('/')
    if ((repoArray.length - 1) >2 ) { //Contains a path also
        JustRepo = repoArray[0]+'/' +repoArray[1]
        for (i = 2; i < repoArray.length; i++) {
            if (repoArray[i] !== '') {
                TopPath += repoArray[i] + "/";
            } 
        }
    }

    CurrentPath = TopPath
    masterURL = 'https://api.github.com/repos/' + JustRepo + '/branches/master'

    console.log('Master URL: ' + masterURL)
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
            BuildSiteTree(treeObject, folder_target)
            LoadItemsToPage(Push = false, Replace = true)
            LoadNavbar(SiteTree)
            return;
        };
        fileTreeReq.send();
    };
    lastCommitReq.send();
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

function SetSiteBrand(title, theme) {
    titleEl = document.getElementsByClassName('navbar-brand')[0]
    titleEl.innerHTML = title
    titleEl.setAttribute('href', window.location.href)
    titleEl.classList.add(theme['brand_font_class']);
}

function LoadNavbar(site_tree) {
    var top_navs = []
    var children = {}
    for (const [key, value] of Object.entries(site_tree)) {
        var trimmed_key = key
        if (key.indexOf(TopPath) == 0) {
            trimmed_key = trimmed_key.replace(TopPath, '')
        }
        if (value.Target == 'NAV') {
            parts = trimmed_key.split('/')
            if (parts.length > 1) {
                parent_key = parts.slice(0, parts.length - 1).join('/')

                if (TopPath != '') {
                    parent_key = TopPath + parent_key
                }

                if (!(parent_key in children)) {
                    children[parent_key] = []
                }
                children[parent_key].push(key)
            }
            else {
                children[key] = []
                top_navs.push(key)
            }
        }
    }
    var html = '<ul class="navbar-nav">'
    top_navs.forEach(function (top_nav) {
        if (children[top_nav].length > 0) {
            html += '<li class="nav-item dropdown">'
            html += '<div class="dropdown-item" onclick="LoadItemsFromPathLink(\'' + top_nav + '/\')">' + site_tree[top_nav].Title +'</div>'
            html += '<a class="nav-link dropdown-toggle dropdown-item expander_nav" href="#" data-bs-toggle="dropdown"></a>'
        }
        else {
            html += '<li class="nav-item">'
            html += '<div class="dropdown-item" onclick="LoadItemsFromPathLink(\'' + top_nav + '/\')">' + site_tree[top_nav].Title + '</div>'
        }
        html += AddChildNavs(top_nav, children, site_tree, 0)
        html += '</li>'
    })
    html += '</ul>'
    document.getElementById('main_nav').innerHTML = html;

    if (window.innerWidth < 992) {

        // close all inner dropdowns when parent is closed
        document.querySelectorAll('.navbar .dropdown').forEach(function (everydropdown) {
            everydropdown.addEventListener('hidden.bs.dropdown', function () {
                // after dropdown is hidden, then find all submenus
                this.querySelectorAll('.submenu').forEach(function (everysubmenu) {
                    // hide every submenu as well
                    everysubmenu.style.display = 'none';
                });
            })
        });

        document.querySelectorAll('.dropdown-menu a').forEach(function (element) {
            element.addEventListener('click', function (e) {
                let nextEl = this.nextElementSibling;
                if (nextEl && nextEl.classList.contains('submenu')) {
                    // prevent opening link if link needs to open dropdown
                    e.preventDefault();
                    if (nextEl.style.display == 'block') {
                        nextEl.style.display = 'none';
                    } else {
                        nextEl.style.display = 'block';
                    }

                }
            });
        })
    }
}

function AddChildNavs(key, children, site_tree, level) {
    html = '';
    if (key in children) {
        if (level == 0) {
            html += '<ul class="dropdown-menu">'
        }
        else {
            html += '<ul class="submenu dropdown-menu">'
        }
        children[key].forEach(function (child) {
            html += '<div class="dropdown-item" onclick="LoadItemsFromPathLink(\''+child+'/\')">' + site_tree[child].Title + '</div>'
            //html += '<li><a class="dropdown-item" href="#" style="display:inline;width:80%"></a>'
            if (child in children) {
                html += '<li><div class="dropdown-item expander" href="#" style="">&raquo;</div>'
                html += AddChildNavs(child, children, site_tree, level + 1)
                html += '</li>'
            }
        })
        html += '</ul>'
    }
    return html
}

// --- THEME CONSTANTS ---
const SITE_BG_GRADIENTS = {
    mist:    'linear-gradient(90deg,#e9f1fb 0%,#e3f6fd 100%)',
    silver:  'linear-gradient(90deg,#f4f4f4 0%,#eaeaea 100%)',
    coral:   'linear-gradient(90deg,#ffe1c6 0%,#ffc6c7 100%)',
    seafoam: 'linear-gradient(90deg,#e0f7ef 0%,#d0f5e8 100%)',
    apricot: 'linear-gradient(90deg,#ffe5d0 0%,#ffe0b2 100%)',
    sky:     'linear-gradient(90deg,#e0f0ff 0%,#c7eafd 100%)',
    blush:   'linear-gradient(90deg,#f8e1ec 0%,#fad0c4 100%)',
    white:   '#fff',
};
const ITEM_BG_GRADIENTS = {
    darkgray: 'linear-gradient(135deg,#2d3035 0%,#444851 100%)',
    blue:     'linear-gradient(135deg,#23374d 0%,#406882 100%)',
    purple:   'linear-gradient(135deg,#2e294e 0%,#5f4b8b 100%)',
    coral:    'linear-gradient(135deg,#3b2d2f 0%,#ff6f61 100%)',
    seafoam:  'linear-gradient(135deg,#234e4e 0%,#43e97b 100%)',
    apricot:  'linear-gradient(135deg,#4e342e 0%,#ffb347 100%)',
    sky:      'linear-gradient(135deg,#223a5e 0%,#38a3a5 100%)',
    blush:    'linear-gradient(135deg,#4b2c3e 0%,#ff5eae 100%)',
    none:     '#222',
};
const CORNER_RADII = {
    none: '0px',
    small: '6px',
    medium: '14px',
    large: '30px',
};

/**
 * Safely get a theme value from a map, fallback to a default if not found.
 */
function getThemeValue(map, key, fallback) {
    return map.hasOwnProperty(key) ? map[key] : fallback;
}

/**
 * Apply the selected theme to the site, including background and palette items.
 * @param {Object} theme - Theme object with bg_gradient, corner_radius, palette_gradient keys.
 */
let CurrentTheme = null;
function ApplyTheme(theme) {
    // Background gradient
    const bg = getThemeValue(SITE_BG_GRADIENTS, theme.bg_gradient, SITE_BG_GRADIENTS.white);
    document.body.style.background = bg;
    // Corner rounding only for .paletteColour1
    const radius = getThemeValue(CORNER_RADII, theme.corner_radius, CORNER_RADII.medium);
    // Apply to all .paletteColour1 divs
    setTimeout(() => {
        document.querySelectorAll('.paletteColour1').forEach(div => {
            div.style.borderRadius = radius;
            // Palette card gradient
            const paletteBg = getThemeValue(ITEM_BG_GRADIENTS, theme.palette_gradient, ITEM_BG_GRADIENTS.none);
            div.style.background = paletteBg;
        });
    }, 200);
}


function LoadFromParams() {
    res = getJsonFromUrl();
    console.log('URL Params');
    console.log(res);
    if ('Repo' in res && res.Repo != '') {
        document.getElementById('loadBox').style.display = "none";
        folder_target = 'NAV';
        if ('LM' in res) {
            folder_target = res.LM;
        }
        GetRepoFiles(res.Repo, folder_target);
        if ('Title' in res && res.Title != '') {
            SetSiteBrand(res.Title, res['Theme']);
        } else {
            title = res.Repo.substring(res.Repo.indexOf('/') + 1);
            SetSiteBrand(title, res['Theme']);
        }
        CurrentTheme = res['Theme'];
        ApplyTheme(CurrentTheme);
    } else { //Showing the site generator
        document.getElementById('content').style.display = "none";
    }
}


window.onpopstate = function (event) {
    getJsonFromUrl()
    LoadItemsToPage(Push=false,Replace=false)
};