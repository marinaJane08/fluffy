import React, { useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';

const Popup = () => {
    const port = useRef();
    // 控制页面内部是否显示开关按钮
    const [on, setOn] = useState(localStorage.getItem('on'));
    useEffect(() => {
        //建立长连接
        port.current = chrome.runtime.connect({ name: "popup" });
    }, []);
    const toggleOn = () => {
        // localStorage存储数据格式为字符串，故使用空字符串来标识“关闭”
        let isOn = on ? '' : '1';
        setOn(isOn);
        localStorage.setItem('on', isOn);
        port.current.postMessage({ type: "toContent", payload: { type: 'toggleAppOn', payload: isOn } });
    }
    return (
        <div className="App">
            <button onClick={toggleOn}>总{on ? '开' : '关'}</button>
        </div>
    )
}

render(<Popup />, window.document.querySelector('#app'));

if (module.hot) module.hot.accept();
