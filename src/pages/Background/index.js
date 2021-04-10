import localforage from '@/utils/localforage.min';

let contentPort, popupPort;

const handler = {
    getData: function (data, port) {//查询
        localforage.getItem(data.key).then(val => {
            if (val) {
                port.postMessage({ type: 'getData', data: val });
            }
        });
    },
    updateData: function (data, port) {//更新
        localforage.getItem(data.key).then(val => {
            if (val) {
                console.log('更新前', val, data.obj)
                val = { ...val, ...data.obj };
                console.log('更新前后', val)
                console.log(new Date().toLocaleString())
                localforage.setItem(data.key, val);
            } else {
                localforage.setItem(data.key, data.obj);
            }
        });
    },
    delData: function (data, port) {
        localforage.removeItem(data.key)
    },
    toContent(msg, port) {
        // popup发送消息，中转给content
        contentPort.postMessage(msg);
    },
    setLocal() {
        chrome.storage.local.set({ key: value }, function () {
            console.log('Value is set to ' + value);
        });
    },
    getLocal() {
        // key为null时返回所有数据
        chrome.storage.local.get(['user1', 'user2'], function (result) {
            console.log('Value currently is ' + result);
        });
    }
}
// 存储区变动
// chrome.storage.onChanged.addListener(function(changes, areaName){
//     console.log('Value in '+areaName+' has been changed:');
//     console.log(changes);
// });
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
