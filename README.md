# fluffy

> 2021年4月6日
选择容器
使用port通信（background作中转）
使用chrome.storage存储(local本地、sync账户同步)
预估时间

> 2021年4月5日
popup开关控制content总开关

> 2021年4月4日
监听数据：chrome.extension.onMessage.addListener
background/popup发送数据：chrome.extension.sendMessage
tab发送数据：chrome.tabs.query({ active: true, currentWindow: true } => chrome.tabs.sendMessage

## [脚手架源](https://github.com/lxieyang/chrome-extension-boilerplate-react)
1. Change the package's `name`, `description`, and `repository` fields in `package.json`.
2. Change the name of your extension on `src/manifest.json`.
3. Run `npm install` to install the dependencies.
4. Run `npm start`
5. Load your extension on Chrome following:
   1. Access `chrome://extensions/`
   2. Check `Developer mode`
   3. Click on `Load unpacked extension`
   4. Select the `build` folder.
## 指定端口运行
```
$ PORT=6002 npm run start
```
## 排除不需要热更新的文件
```js
{
  …
  entry: {
    myContentScript: "./src/js/myContentScript.js"
  },
  chromeExtensionBoilerplate: {
    notHotReload: ["myContentScript"]
  }
  …
}
```

and on your `src/manifest.json`:

```json
{
  "content_scripts": [
    {
      "matches": ["https://www.google.com/*"],
      "js": ["myContentScript.bundle.js"]
    }
  ]
}
```
## 打包
```
$ NODE_ENV=production npm run build
```
## 私密文件(已加入ignore)
_./secrets.development.js_

```js
export default { key: '123' };
```
