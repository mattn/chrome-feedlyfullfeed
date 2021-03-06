var dbUrl = 'http://wedata.net/databases/LDRFullFeed/items.json';

function getSiteInfo(data, callback){
  if(localStorage.length != 0){
    callback({
      task: "siteinfo",
      result: true,
      content: JSON.parse(localStorage.getItem("SITEINFO"))
    });
  }
  
  try{
    var req = new XMLHttpRequest();
    req.open('GET', dbUrl, true);
    
    req.onload = function(res) {
      try {
        if (req.status != 200){
          callback(req.onerror(req.statusText));
          return;
        }
        var siteinfo_cache = JSON.parse(req.responseText)
          .map(function(i){ return i.data })
          .sort(function(lhs, rhs){ return rhs.priority - lhs.priority });
        localStorage.setItem("SITEINFO", JSON.stringify(siteinfo_cache));
        callback({task: "siteinfo", result: true, content: siteinfo_cache});
      } catch(e) {
        callback({
          task: "siteinfo", result: false, reason: 'maybe invalid siteinfo'
        })
      }
    };
    
    req.onerror =
      function(e) { return {task: "siteinfo", result: false, reason: e} };
    
    req.send(null);
  } catch(e) { callback({task: "siteinfo", result: false, reason: e}) }
}

window.onload = function() {
  var ports = [];
  
  chrome.extension.onConnect.addListener(function(port) {
    ports.push(port);
    
    port.onMessage.addListener(function(data) {
      switch(data.task) {
        case "open":
          chrome.tabs.create({url: data.url, selected: false})
          break;
        case "siteinfo":
          getSiteInfo(data, function(result){ port.postMessage(result) });
          break;
        case "expand":
          data.url = 'http://expand-ext0.appspot.com/?0=' + encodeURIComponent(data.url);
        case "fullfeed":
          try{
            var req = new XMLHttpRequest();
            
            req.open('GET', data.url, true);
            req.onload = function(res){
              if(req.status != 200){ return req.onerror(req.statusText) }
              data.result = true;
              data.content = req.responseText;
              port.postMessage(data);
            };
            
            req.onerror = function(e){
              data.result = false;
              data.reason = e;
              port.postMessage(data);
            };
            
            req.send(null);
          } catch(e) {
            data.result = false;
            data.reason = e;
            port.postMessage(data);
          }
          
          break;
      }
    });
  });
  
  chrome.pageAction.onClicked.addListener(function() {
    localStorage.clear();
    ports.forEach(function(port) {
      port.postMessage({result: true, task: 'update-siteinfo'})
    })
  });
}
