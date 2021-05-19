let contentPort, popupPort;

const handler = {
    toContent(msg, port) {
        // popup发送消息，中转给content
        contentPort.postMessage(msg);
    },
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
