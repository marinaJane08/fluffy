//pop审查元素可见
// localforage.setItem('bg',1);
//接收cs的msg，并返回
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  localforage.getItem(request.key).then((val) => {
    //新增记录
    if (!val) {
      localforage.setItem(request.key, []);
    } else if (request.val) {
      //将val push 进去
      val.push(request.val)
      localforage.setItem(request.key, val);
    }
    //只是打开已有的页面啦
  })
  sendResponse(200);
});
// chrome.omnibox.onInputChanged.addListener(
//   function (text, suggest) {
//     chrome.history.search({'text':text}, function(results){
//       alert(results);
//     });
//   });

// // This event is fired with the user accepts the input in the omnibox.
// chrome.omnibox.onInputEntered.addListener(
//   function (text) {
//     console.log('inputEntered: ' + text);
//     alert('You just typed "' + text + '"');
//   });