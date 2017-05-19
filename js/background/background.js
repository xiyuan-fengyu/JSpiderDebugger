let debugTabs = {};
let debugUrlReg = "^http://localhost/jspider/debug\\?host=(.+?)&js=(.+?)&url=(.+?)$";
let windowEx = {};

chrome.runtime.onMessage.addListener(function(message, sender) {
    if (message.type == "loadJs") {
        let loadedJsArr = [];
        let total = message.srcs.length;
        message.srcs.forEach(src => {
            loadJs(src, (jsUrl, jsContent, success) => {
                loadedJsArr.push({
                    jsUrl: jsUrl,
                    jsContent: jsContent
                });
                if (loadedJsArr.length >= total) {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        id: message.id,
                        type: "loadJsComplete",
                        jsArr: loadedJsArr
                    });
                }
            })
        })
    }
});

chrome.tabs.onCreated.addListener(function (tab) {
    let openerTabId = tab.openerTabId;
    if (debugTabs[openerTabId]) {
        let temp = debugTabs[openerTabId];
        debugTabs[tab.id] = {};
        for (let key in temp) {
            debugTabs[tab.id][key] = temp[key];
        }
        debugTabs[tab.id].isContentJsExecuted = false;
    }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    let matchs = tab.url.match(debugUrlReg);
    let debugTab = debugTabs[tabId];
    if (matchs) {
        let host = matchs[1];
        let jsUrl = matchs[2];
        let targetUrl = matchs[3];

        debugTabs[tabId] = {
            taskId: new Date().getTime() + "_" + parseInt(Math.random() * 10000),
            host: host,
            jsUrl: "http://" + host + "/" + jsUrl,
            isContentJsExecuted: false
        };

        chrome.tabs.update(tabId, {
            url: targetUrl
        });
    }
    else if (debugTab) {
        if (tab.status == "complete") {
            if (!debugTab[tab.url]) {
                debugTab[tab.url] = true;

                debugTab.isContentJsExecuted = false;
                let executeJs = function () {
                    if (debugTab.isContentJsExecuted && debugTab.jsContent && windowEx.jsContent) {
                        //解析用户的额外数据
                        var userDatasStr = url.split("userDatas=")[1];
                        userDatasStr = decodeURIComponent(userDatasStr);
                        var userDatas;
                        try {
                            userDatas = JSON.parse(userDatasStr);
                        }
                        catch (e) {
                            userDatas = {};
                        }

                        chrome.tabs.sendMessage(tabId, {
                            type: "executeJs",
                            jsArr: [
                                windowEx,
                                debugTab
                            ],
                            taskId: debugTab.taskId,
                            userDatas: userDatas
                        });
                        return true;
                    }
                    else return false;
                };

                if (!debugTab.isContentJsExecuted) {
                    chrome.tabs.executeScript(tabId, {
                        file: "js/content/content.js",
                        runAt: "document_start"
                    }, function () {
                        debugTab.isContentJsExecuted = true;
                        executeJs();
                    });
                }

                if (!windowEx.jsContent) {
                    windowEx.jsUrl = "http://" + debugTab.host + "/phantom/windowEx.js";
                    loadJs(windowEx.jsUrl, function (jsUrl, jsContent, success) {
                        windowEx.jsContent = jsContent;
                        executeJs();
                    });
                }

                if (!debugTab.jsContent) {
                    loadJs(debugTab.jsUrl, function (jsUrl, jsContent, success) {
                        debugTab.jsContent = jsContent;
                        executeJs();
                    });
                }
                else {
                    executeJs();
                }
            }
        }
        else if (tab.status == "loading") {
            debugTab[tab.url] = false;
        }
    }
});

function loadJs(jsUrl, callback) {
    jQuery.get(jsUrl, function (js, success) {
        if (typeof callback == "function") {
            callback(jsUrl, js, success);
        }
    });
}

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    delete debugTabs[tabId];
});