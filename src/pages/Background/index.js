import { removeClass, addClass, getEvalRoot, getTimeStamp, formatDuration, findElParent, copyRemoveContents } from '@/utils';

let contentPort, popupPort;

const log = console.log;
const dir = console.dir;

const handler = {
    toContent(msg, port) {
        // popup发送消息，中转给content
        contentPort.postMessage(msg);
    },
}
// 存储区变动
chrome.storage.onChanged.addListener(function (changes, areaName) {
    console.log(`areaName:${areaName}`, changes);
});
chrome.runtime.onConnect.addListener(function (port) {
    if (port.name === 'content') {
        contentPort = port;
    }
    if (port.name === 'popup') {
        popupPort = port;
    }
    port.onMessage.addListener(function (msg) {
        handler[msg.type] && handler[msg.type](msg.payload, port);
    });
});

// 监听tab改变
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 路由改变
    if (changeInfo.url) {
        chrome.tabs.sendMessage(tabId, { type: "restoreRoot" });
    }
})
