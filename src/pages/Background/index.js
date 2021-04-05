import localforage from '@/utils/localforage.min';

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
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // content发送的消息，在popup、newTab中亦会触发background的监听
    console.log('background监听到消息', request, sender)
    // handler[msg.type] && handler[msg.type](msg.data, port)
    // sendResponse("background返回值");
})
