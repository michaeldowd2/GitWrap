let SiteTree = {};
let JustRepo = '';
let RepoBranch = 'master';
let TopPath = '';
let CurrentPath = '';
let TotalItems = 0;
let CurrentItems = 0;
let CurrentTheme = null;
let procsongScriptsPromise = null;
let procsongInstanceId = 0;
let wavScriptsPromise = null;
let wavInstanceId = 0;
let layoutObserver = null;
let masonryTimer = null;


// --- THEME CONSTANTS ---
const SITE_BG_GRADIENTS = {
    mist:    'linear-gradient(90deg,#e9f1fb 0%,#ffd9b3 100%)', // light blue to light orange (complementary, more saturated)
    silver:  'linear-gradient(90deg,#f6f6f6 0%,#fffbe0 100%)', // silver to pale yellow (lighter)
    coral:   'linear-gradient(90deg,#ffe1c6 0%,#aee9ff 100%)', // soft coral to light aqua (complementary, more saturated)
    seafoam: 'linear-gradient(90deg,#e0f7ef 0%,#f7e0e7 100%)', // mint to soft pink (complementary, lighter)
    apricot: 'linear-gradient(90deg,#fff3e0 0%,#ffe0e0 100%)', // apricot to very pale pink (lighter)
    sky:     'linear-gradient(90deg,#e0f0ff 0%,#ffb3e6 100%)', // sky blue to soft pink (complementary, more saturated)
    blush:   'linear-gradient(90deg,#f8e1ec 0%,#b3e6ff 100%)', // blush pink to pale blue (complementary, more saturated)
    white:   'linear-gradient(90deg,#fff 0%,#bdbdbd 100%)',
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
    theme['bg_gradient'] = parts[1] || 'mist';
    theme['corner_radius'] = parts[2] || 'none';
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
            // Do not assign to the global name URL — that overwrites window.URL
            // (the constructor) and breaks Dropbox URL rewriting + createObjectURL.
            var rawUrl = item['url']
            if (item["type"]=='blob') {
                rawUrl = 'https://raw.githubusercontent.com/' + JustRepo + '/' + RepoBranch + '/'+item.path
            }
            title = item.path.substring(item.path.lastIndexOf('/')+1)
            target = ParseTargetFromTitle(title); 
            newItem = null;
            if (item["type"]=='blob' && (item["path"].toUpperCase().includes('.JPG') || item["path"].toUpperCase().includes('.PNG'))) {                
                if (target===null) {target='GALLERY';}
                newItem = {Type: "Image", Path: item.path, URL: rawUrl, Target:target }
            }
            else if (item["type"]=='blob' && item["path"].toUpperCase().includes('.PRCSLIB')) {
                if (target===null) {target='GALLERY';}
                newItem = {Type: "ProcsongLibrary", Path: item.path, URL: rawUrl, Target:target }
            }
            else if (item["type"]=='blob' && item["path"].toUpperCase().includes('.WAVLIB')) {
                if (target===null) {target='GALLERY';}
                newItem = {Type: "WavLibrary", Path: item.path, URL: rawUrl, Target:target }
            }
            else if (item["type"]=='blob' && (/\.MP3(\b|$)/i.test(item["path"]) || /\.WAV(\b|$)/i.test(item["path"]))) {
                if (target===null) {target='GALLERY';}
                newItem = {Type: "Audio", Path: item.path, URL: rawUrl, Target:target }
            }
            else if (item["type"]=='blob' && (item["path"].toUpperCase().includes('.HTML')) && !item["path"].toUpperCase().includes('INDEX.HTML')) {
                if (target===null) {target='PAGE';}
                newItem = {Type: "Html", Path: item.path, URL: rawUrl, Target:target }
            }
            else if (item["type"]=='blob' && item["path"].toUpperCase().includes('.URL')) {
                if (target === null) { target = folder_target;}
                newItem = {Type: "Url", Path: item.path, URL: rawUrl, Target:target }
            }
            else if (item["type"]=='tree'){
                if (target === null) { target = folder_target;}
                newItem = {Type: "Folder", Path:item.path+'/', URL: rawUrl, Target:target }
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
    var pathUpper = (Item.Path || Item.URL || '').toUpperCase();
    var mime = pathUpper.indexOf('.WAV') >= 0 ? 'audio/wav' : 'audio/mpeg';
    Container.innerHTML += `
    <div class = "grid-item animated fadeIn col-lg-4 col-md-6 col-sm-12">
        <div class = "col-sm-12">
            <h5>` + Item.Title + `</h5>
        </div>
        <div class = "col-sm-12">
            <audio controls>
                <source src = "` + Item.URL + `" type = "` + mime + `">
                Your browser does not support the audio element
            </audio>
        </div>
     </div>`
     CheckItemCountAndRefreshMasonry()
}

function gitwrapAssetBaseUrl() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src || '';
        if (src.indexOf('GitWrap.js') !== -1) {
            return src.replace(/GitWrap\.js(?:\?.*)?$/, '');
        }
    }
    return 'dist/';
}

function loadScriptOnce(src) {
    return new Promise(function(resolve, reject) {
        var existing = document.querySelector('script[data-gitwrap-src="' + src + '"]');
        if (existing) {
            if (existing.getAttribute('data-loaded') === '1') {
                resolve();
                return;
            }
            existing.addEventListener('load', function() { resolve(); });
            existing.addEventListener('error', function() { reject(new Error('Failed to load ' + src)); });
            return;
        }
        var script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.setAttribute('data-gitwrap-src', src);
        script.onload = function() {
            script.setAttribute('data-loaded', '1');
            resolve();
        };
        script.onerror = function() {
            reject(new Error('Failed to load ' + src));
        };
        document.head.appendChild(script);
    });
}

function ensureProcsongScripts() {
    if (procsongScriptsPromise) {
        return procsongScriptsPromise;
    }
    procsongScriptsPromise = loadScriptOnce('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')
        .then(function() {
            return loadScriptOnce('https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js');
        })
        .then(function() {
            return loadScriptOnce('https://cdn.jsdelivr.net/gh/michaeldowd2/procsong@main/players/web/proc_song.js');
        })
        .then(function() {
            return loadScriptOnce('https://cdn.jsdelivr.net/gh/michaeldowd2/procsong@main/players/web/proc_library.js');
        })
        .catch(function(err) {
            procsongScriptsPromise = null;
            throw err;
        });
    return procsongScriptsPromise;
}

function ensureWavScripts() {
    if (wavScriptsPromise) {
        return wavScriptsPromise;
    }
    var base = gitwrapAssetBaseUrl();
    // Cache-bust so local file:// / refresh picks up component edits.
    var bust = '?v=20261004c';
    wavScriptsPromise = loadScriptOnce(base + 'components/wav_player.js' + bust)
        .then(function() {
            return loadScriptOnce(base + 'components/wav_library.js' + bust);
        })
        .catch(function(err) {
            wavScriptsPromise = null;
            throw err;
        });
    return wavScriptsPromise;
}

function AddProcsongLibrary(Container, Item) {
    procsongInstanceId += 1;
    var id = procsongInstanceId;
    var libraryId = 'procsong-library-' + id;
    var playerId = 'procsong-player-' + id;

    var wrapper = document.createElement('div');
    wrapper.className = 'grid-item animated fadeIn col-lg-8 col-md-12 col-sm-12 procsong-embed';

    var panel = document.createElement('div');
    panel.className = 'paletteColour1 procsong-panel';

    var titleEl = document.createElement('h1');
    titleEl.textContent = Item.Title || 'Procsong';
    panel.appendChild(titleEl);

    if (Item.Subtitle) {
        var subtitleEl = document.createElement('small');
        subtitleEl.textContent = Item.Subtitle;
        panel.appendChild(subtitleEl);
    }

    var libraryEl = document.createElement('div');
    libraryEl.id = libraryId;
    libraryEl.className = 'procsong-library';

    var playerEl = document.createElement('div');
    playerEl.id = playerId;
    playerEl.className = 'procsong-player';

    var statusEl = document.createElement('p');
    statusEl.className = 'procsong-status';
    statusEl.textContent = 'Loading procsong…';

    panel.appendChild(statusEl);
    panel.appendChild(libraryEl);
    panel.appendChild(playerEl);
    wrapper.appendChild(panel);
    Container.appendChild(wrapper);
    watchDynamicLayout(wrapper);

    if (CurrentTheme) {
        ApplyTheme(CurrentTheme);
    }

    ensureProcsongScripts()
        .then(function() {
            statusEl.remove();
            var player = new ProcsongPlayer({
                target: playerEl,
                heading: '',
            });
            player.initialise();
            var library = new ProcsongLibrary({
                target: libraryEl,
                player: playerEl,
                library: Item.URL,
                heading: '',
            });
            return library.initialise();
        })
        .then(function() {
            CheckItemCountAndRefreshMasonry();
            // Layout may change after library rows render
            setTimeout(RefreshMasonry, 100);
        })
        .catch(function(err) {
            if (!statusEl.isConnected) {
                panel.insertBefore(statusEl, libraryEl);
            }
            statusEl.textContent = 'Failed to load procsong: ' + (err && err.message ? err.message : err);
            statusEl.classList.add('is-error');
            CheckItemCountAndRefreshMasonry();
        });
}

function AddWavLibrary(Container, Item) {
    wavInstanceId += 1;
    var id = wavInstanceId;
    var libraryId = 'wav-library-' + id;
    var playerId = 'wav-player-' + id;

    var wrapper = document.createElement('div');
    wrapper.className = 'grid-item animated fadeIn col-lg-8 col-md-12 col-sm-12 wavlib-embed';

    var panel = document.createElement('div');
    panel.className = 'paletteColour1 wavlib-panel';

    var titleEl = document.createElement('h1');
    titleEl.textContent = Item.Title || 'Audio';
    panel.appendChild(titleEl);

    if (Item.Subtitle) {
        var subtitleEl = document.createElement('small');
        subtitleEl.textContent = Item.Subtitle;
        panel.appendChild(subtitleEl);
    }

    var libraryEl = document.createElement('div');
    libraryEl.id = libraryId;
    libraryEl.className = 'wav-library';

    var playerEl = document.createElement('div');
    playerEl.id = playerId;
    playerEl.className = 'wav-player-host';

    var statusEl = document.createElement('p');
    statusEl.className = 'wavlib-status-msg';
    statusEl.textContent = 'Loading audio library…';

    panel.appendChild(statusEl);
    panel.appendChild(libraryEl);
    panel.appendChild(playerEl);
    wrapper.appendChild(panel);
    Container.appendChild(wrapper);
    watchDynamicLayout(wrapper);

    if (CurrentTheme) {
        ApplyTheme(CurrentTheme);
    }

    ensureWavScripts()
        .then(function() {
            statusEl.remove();
            var player = new WavPlayer({
                target: playerEl,
                heading: '',
            });
            player.initialise();
            var library = new WavLibrary({
                target: libraryEl,
                player: playerEl,
                library: Item.URL,
                heading: '',
            });
            return library.initialise();
        })
        .then(function() {
            CheckItemCountAndRefreshMasonry();
            setTimeout(RefreshMasonry, 100);
        })
        .catch(function(err) {
            if (!statusEl.isConnected) {
                panel.insertBefore(statusEl, libraryEl);
            }
            statusEl.textContent = 'Failed to load audio library: ' + (err && err.message ? err.message : err);
            statusEl.classList.add('is-error');
            CheckItemCountAndRefreshMasonry();
        });
}

function LoadItemsFromPathLink(Path){
    CurrentPath = Path;
    LoadItemsToPage();
    if (CurrentTheme) {
        ApplyTheme(CurrentTheme);
    }
}

function layoutMasonryNow() {
    var grid = document.querySelector('.galleryRender');
    if (!grid || typeof Masonry === 'undefined') return;
    var msnry = (typeof Masonry.data === 'function') ? Masonry.data(grid) : null;
    if (!msnry) {
        msnry = new Masonry(grid, {
            itemSelector: '.grid-item',
            transitionDuration: '0.2s'
        });
    } else {
        msnry.reloadItems();
        msnry.layout();
    }
}

function RefreshMasonry() {
    if (typeof imagesLoaded === 'function') {
        imagesLoaded('.grid', layoutMasonryNow);
    } else {
        layoutMasonryNow();
    }
}

function scheduleMasonry() {
    if (masonryTimer) clearTimeout(masonryTimer);
    masonryTimer = setTimeout(function() {
        masonryTimer = null;
        layoutMasonryNow();
    }, 80);
}

function watchDynamicLayout(el) {
    if (!el || typeof ResizeObserver === 'undefined') return;
    if (!layoutObserver) {
        layoutObserver = new ResizeObserver(function() {
            scheduleMasonry();
        });
    }
    layoutObserver.observe(el);
}

function resetLayoutWatch() {
    if (layoutObserver) layoutObserver.disconnect();
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
    
    resetLayoutWatch();
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
            else if (item["Type"]=='ProcsongLibrary') {AddProcsongLibrary(targetContainer, item);}
            else if (item["Type"]=='WavLibrary') {AddWavLibrary(targetContainer, item);}
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

function isMenuItem(item) {
    if (!item) return false;
    return item.Type === 'Folder'
        || item.Type === 'Url'
        || item.Type === 'ProcsongLibrary'
        || item.Type === 'WavLibrary';
}

function parentFolderPath(path) {
    var parts = String(path || '').split('/').filter(Boolean);
    if (parts.length <= 1) return '';
    parts.pop();
    return parts.join('/') + '/';
}

function openStoredUrl(item) {
    var req = new XMLHttpRequest();
    req.open('GET', item.URL, true);
    req.onload = function() {
        var dest = '';
        if (req.status === 200) {
            dest = String(req.responseText || '').replace(/URL:/ig, '').trim();
        }
        if (dest) window.location = dest;
    };
    req.send();
}

function activateMenuItem(meta, fullPath) {
    if (meta && meta.Type === 'Url') {
        openStoredUrl(meta);
        return;
    }
    // Libraries render on their parent folder page, not as their own route.
    if (meta && (meta.Type === 'ProcsongLibrary' || meta.Type === 'WavLibrary')) {
        LoadItemsFromPathLink(parentFolderPath(meta.Path));
        return;
    }
    LoadItemsFromPathLink(fullPath);
}

function buildTreeFromFlatJson(flatSite) {
    const root = {};
    function ensureNode(children, part) {
        if (!children[part]) children[part] = { __children: {}, __meta: null };
        return children[part];
    }
    for (const key in flatSite) {
        const item = flatSite[key];
        if (!isMenuItem(item)) continue;
        const parts = item.Path.split('/').filter(Boolean);
        let children = root;
        let node = null;
        for (let i = 0; i < parts.length; i++) {
            node = ensureNode(children, parts[i]);
            children = node.__children;
        }
        if (node) node.__meta = item;
    }
    return root;
}

function closeAllMenus() {
    document.querySelectorAll('.gw-submenu.show').forEach(function(menu) {
        menu.classList.remove('show');
    });
    document.querySelectorAll('.gw-menu-expander.is-open').forEach(function(btn) {
        btn.classList.remove('is-open');
    });
}

function closeSiblingMenus(li) {
    if (!li.parentNode) return;
    Array.from(li.parentNode.children).forEach(function(sibling) {
        if (sibling === li) return;
        sibling.querySelectorAll('.gw-submenu.show').forEach(function(menu) {
            menu.classList.remove('show');
        });
        sibling.querySelectorAll('.gw-menu-expander.is-open').forEach(function(btn) {
            btn.classList.remove('is-open');
        });
    });
}

function placeSubmenu(li, submenu, isRoot) {
    submenu.classList.remove('gw-submenu-right');
    if (isRoot) return;
    var rect = li.getBoundingClientRect();
    if (rect.left < 260) submenu.classList.add('gw-submenu-right');
}

function createMenu(node, parentPath = '', isRoot = true) {
    const ul = document.createElement('ul');
    ul.className = isRoot ? 'navbar-nav flex-row flex-wrap main-navbar' : 'gw-submenu';

    for (const key in node) {
        if (!node.hasOwnProperty(key)) continue;
        const item = node[key];
        const meta = item.__meta;
        const fullPath = meta ? meta.Path : (parentPath ? parentPath + '/' + key : key);
        const label = meta ? (meta.Title || key) : key;

        const li = document.createElement('li');
        li.className = isRoot
            ? 'nav-item gw-menu-item'
            : 'gw-menu-item';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = isRoot
            ? 'nav-link btn btn-link px-3 py-2 text-dark gw-menu-label'
            : 'gw-menu-label';
        btn.textContent = label;
        btn.onclick = (e) => {
            e.stopPropagation();
            activateMenuItem(meta, fullPath);
            closeAllMenus();
        };

        li.appendChild(btn);

        const hasChildren = Object.keys(item.__children).length > 0;
        let childUl = null;
        if (hasChildren) {
            const expanderBtn = document.createElement('button');
            expanderBtn.type = 'button';
            expanderBtn.className = 'gw-menu-expander';
            expanderBtn.setAttribute('aria-label', 'Show pages inside ' + label);
            expanderBtn.title = 'Show pages inside';
            expanderBtn.innerHTML = '<span class="gw-chevron" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 6.646a.5.5 0 0 1 .708 0L8 9.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z"/></svg></span>';

            expanderBtn.onclick = function(e) {
                e.stopPropagation();
                closeSiblingMenus(li);
                const isOpen = childUl && childUl.classList.contains('show');
                if (isOpen) {
                    childUl.classList.remove('show');
                    expanderBtn.classList.remove('is-open');
                    childUl.querySelectorAll('.gw-submenu.show').forEach(function(menu) {
                        menu.classList.remove('show');
                    });
                    childUl.querySelectorAll('.gw-menu-expander.is-open').forEach(function(openBtn) {
                        openBtn.classList.remove('is-open');
                    });
                    return;
                }
                if (!childUl) {
                    childUl = createMenu(item.__children, fullPath, false);
                    li.appendChild(childUl);
                }
                placeSubmenu(li, childUl, isRoot);
                childUl.classList.add('show');
                expanderBtn.classList.add('is-open');
            };

            li.appendChild(expanderBtn);
        }

        ul.appendChild(li);
    }

    if (isRoot && !window._menuOutsideClickHandlerAdded) {
        window._menuOutsideClickHandlerAdded = true;
        document.addEventListener('click', function() {
            closeAllMenus();
        });
    }
    return ul;
}

function LoadRepoTreeFromBranch(folder_target, branch, fallbacks) {
    var branchURL = 'https://api.github.com/repos/' + JustRepo + '/branches/' + branch;
    var lastCommitReq = new XMLHttpRequest();
    lastCommitReq.open("GET", branchURL, true);
    lastCommitReq.responseType = "json";
    lastCommitReq.onload = function() {
        if (lastCommitReq.status !== 200 || !lastCommitReq.response || !lastCommitReq.response.commit) {
            if (fallbacks && fallbacks.length) {
                LoadRepoTreeFromBranch(folder_target, fallbacks[0], fallbacks.slice(1));
                return;
            }
            console.error('Failed to load branch', branch, lastCommitReq.status);
            return;
        }
        RepoBranch = branch;
        var obj = lastCommitReq.response;
        var treeURL = obj["commit"]["commit"]["tree"]["url"] + '?recursive=1';
        var fileTreeReq = new XMLHttpRequest();
        fileTreeReq.open("GET", treeURL, true);
        fileTreeReq.responseType = "json";
        fileTreeReq.onload = function() {
            var treeObj = fileTreeReq.response;
            treeObject = treeObj["tree"];
            BuildSiteTree(treeObject, folder_target);
            tree = buildTreeFromFlatJson(SiteTree);

            const navContainer = document.getElementById('second_nav');
            navContainer.appendChild(createMenu(tree));

            LoadItemsToPage(Push = false, Replace = true);
        };
        fileTreeReq.send();
    };
    lastCommitReq.onerror = function() {
        if (fallbacks && fallbacks.length) {
            LoadRepoTreeFromBranch(folder_target, fallbacks[0], fallbacks.slice(1));
            return;
        }
        console.error('Failed to load branch', branch);
    };
    lastCommitReq.send();
}

function branchFallbacks(preferred) {
    var options = [preferred, 'main', 'master'];
    var seen = {};
    return options.filter(function(name) {
        if (!name || seen[name]) return false;
        seen[name] = true;
        return true;
    });
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

    var repoInfoReq = new XMLHttpRequest();
    repoInfoReq.open("GET", 'https://api.github.com/repos/' + JustRepo, true);
    repoInfoReq.responseType = "json";
    repoInfoReq.onload = function() {
        var info = repoInfoReq.response;
        var preferred = (repoInfoReq.status === 200 && info && info.default_branch)
            ? info.default_branch
            : 'master';
        var branches = branchFallbacks(preferred);
        LoadRepoTreeFromBranch(folder_target, branches[0], branches.slice(1));
    };
    repoInfoReq.onerror = function() {
        var branches = branchFallbacks('master');
        LoadRepoTreeFromBranch(folder_target, branches[0], branches.slice(1));
    };
    repoInfoReq.send();
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
function ApplyTheme(theme) {
    // Background gradient
    const bg = getThemeValue(SITE_BG_GRADIENTS, theme.bg_gradient, SITE_BG_GRADIENTS.mist);
    document.body.style.background = bg;
    // Corner rounding only for .paletteColour1
    const radius = getThemeValue(CORNER_RADII, theme.corner_radius, CORNER_RADII.none);
    // Palette card gradient
    const paletteBg = getThemeValue(ITEM_BG_GRADIENTS, theme.palette_gradient, ITEM_BG_GRADIENTS.blue);
    // Apply to all .paletteColour1 divs
    setTimeout(() => {
        document.querySelectorAll('.paletteColour1').forEach(div => {
            div.style.borderRadius = radius;
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