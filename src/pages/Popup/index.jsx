import React, { useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';

const log = console.log;

const Popup = () => {
    // 控制页面内部是否显示开关按钮
    const [on, setOn] = useState(true);
    useEffect(() => {
        // 获取初始化的on值
        chrome.storage.sync.get({ on: on }, (items) => {
            setOn(items.on);
        });
    }, [])
    const toggleOn = () => {
        let onVal = !on;
        setOn(onVal);
        chrome.storage.sync.set({ on: onVal }, () => {
            if (chrome.runtime.lastError) {
                log('存储失败', chrome.runtime.lastError)
            }
        });
    }
    return (
        <div className="App">
            <button onClick={toggleOn}>总{on ? '关' : '开'}</button>
        </div>
    )
}

render(<Popup />, window.document.querySelector('#app'));

if (module.hot) module.hot.accept();
