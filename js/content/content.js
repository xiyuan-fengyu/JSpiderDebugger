/**
 * Created by xiyuan_fengyu on 2017/1/18.
 */

let loadJsTasks = {};

function chromeLoadScript(callback, scripts, sender) {
    let taskId = new Date().getTime() + "_" + parseInt(Math.random() * 10000);
    loadJsTasks[taskId] = callback;
    chrome.runtime.sendMessage(sender.id, {
        id: taskId,
        type: "loadJs",
        srcs: scripts
    });
}

chrome.runtime.onMessage.addListener(function(message, sender, response) {
    if (message.type == "executeJs") {
        var taskId = message.taskId;
        for (let i = 0, len = message.jsArr.length; i < len; i++) {
            let js = message.jsArr[i];
            eval(`//# sourceURL=${js.jsUrl}\n${js.jsContent}`);
        }
    }
    else if (message.type == "loadJsComplete") {
        for (let i = 0, len = message.jsArr.length; i < len; i++) {
            let js = message.jsArr[i];
            eval(`//# sourceURL=${js.jsUrl}\n${js.jsContent}`);
        }
        loadJsTasks[message.id]();
    }
});