import React, { useState, useEffect, Fragment, useReducer, useRef, useContext } from 'react';
import { render } from 'react-dom';

const log = console.log;
window.log = log;

// 模拟content文章
let mock = document.createElement('div');
mock.innerHTML = `<ul>
<li>地址栏内输入xizi即可搜索笔记啦</li>
<li>在网页里按住<b>ctrl + alt</b>键即可选择文<div>章容器，鼠标左</div>键选择‘问题’，按住<b>ctrl</b>键并用鼠标左键选择‘答案’</li>
<li>按住<b>ctrl+T</b>或<b>ctrl+N</b>打开新的<div>标<div>签</div>页，完成你</div>的当日任务</li>
</ul>`
document.body.appendChild(mock);

// 容器
let host = document.createElement('div');
document.body.appendChild(host);

const HostContext = React.createContext();

const Host = () => {
    const [state, dispatch] = useReducer((state, action) => {
        switch (action.type) {
            case 'toggleAppOn':
                return {
                    ...state,
                    appOn: action.payload
                }
            default:
                return state;
        }
    }, {
        appOn: false,
    });
    const { appOn } = state;
    useEffect(() => {
        const handler = {
            toggleAppOn: (payload) => {
                dispatch({ type: 'toggleAppOn', payload });
            }
        }
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            handler[request.type] && handler[request.type](request.payload, sender, sendResponse);
        })
    }, [])

    console.log(state)

    return <HostContext.Provider value={{ state, dispatch }}>
        {appOn ? <div>开关</div> : null}
        <Mark />
    </HostContext.Provider>
}

const Mark = () => {
    const { state, dispatch } = useContext(HostContext);
    const { appOn } = state;
    return <mark>{appOn ? '1' : '2'}</mark>
}

render(<Host />, host);
