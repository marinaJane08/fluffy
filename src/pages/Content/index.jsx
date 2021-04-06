import React, { useState, useEffect, Fragment, useReducer, useRef, useContext } from 'react';
import { render } from 'react-dom';

const log = console.log;
window.log = log;
const body = document.body,
    html = body.parentNode;

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
    const port = useRef();
    const [state, dispatch] = useReducer((state, action) => {
        switch (action.type) {
            case 'toggleAppOn':
                return {
                    ...state,
                    appOn: action.payload
                }
            case 'toggleChoose':
                return {
                    ...state,
                    chooseOn: action.payload
                }
            default:
                return state;
        }
    }, {
        appOn: false,
        chooseOn: false
    });
    const { appOn, chooseOn } = state;
    useEffect(() => {
        const handler = {
            toggleAppOn: (payload) => {
                dispatch({ type: 'toggleAppOn', payload });
            }
        }
        //建立长连接
        port.current = chrome.runtime.connect({ name: "content" });
        port.current.onMessage.addListener((msg, sender) => {
            console.log(msg)
            handler[msg.type] && handler[msg.type](msg.payload)
        });
    }, [])

    return <HostContext.Provider value={{ state, dispatch }}>
        {appOn
            ? <div>
                <button onClick={dispatch.bind(null, { type: 'toggleChoose', payload: !chooseOn })}>选择容器</button>
            </div>
            : null
        }
        <ChooseRoot />
        <Mark />
    </HostContext.Provider>
}

const ChooseRoot = () => {
    const { state, dispatch } = useContext(HostContext);
    const { appOn, chooseOn } = state;
    const [coord, setCoord] = useState([-100, -100]);
    useEffect(() => {
        const on = appOn && chooseOn;
        const canChoose = (evt) => {//判断能否进行选择
            return evt.target !== body && evt.target !== html;
        }
        // 鼠标移动元素浮框
        const mousemove = (evt) => {
            if (on) {
                if (canChoose(evt)) {
                    evt.target.style.boxShadow = '#5cb6ff 0px 0px 0px 2px inset';
                    evt.target.style.cursor = 'pointer';
                    // evt.target.style.border = '2px dashed #8BC34A';
                }
                // 鼠标移动更新坐标
                if (evt.target === body || evt.target === html) {
                    setCoord([evt.clientX, evt.clientY]);
                } else {
                    setCoord([-100, -100]);
                }
            }
        }
        // 鼠标移出恢复样式
        const mouseout = (evt) => {
            if (on && canChoose(evt)) {
                evt.target.style.boxShadow = '';
                evt.target.style.cursor = '';
                // evt.target.style.border = '';
            }
        }
        // 鼠标抬起恢复样式、选中元素
        const mouseup = (evt) => {
            if (on && canChoose(evt)) {
                evt.target.style.boxShadow = '';
                evt.target.style.cursor = '';
                // 设置root
                dispatch({ type: 'changeRoot', payload: evt.target });
            }
        }
        // 鼠标移出视区
        const mouseleave = () => {
            if (on) {
                setCoord([-100, -100]);
            }
        }
        // 右键退出
        const contextmenu = (evt) => {
            if (on) {
                evt.preventDefault();
                setCoord([-100, -100]);
                dispatch({ type: 'changeRoot', payload: false });
            }
        }
        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseout', mouseout);
        document.addEventListener('mouseup', mouseup);
        document.addEventListener('mouseleave', mouseleave);
        document.addEventListener('contextmenu', contextmenu);
        return () => {
            document.removeEventListener('mousemove', mousemove);
            document.removeEventListener('mouseout', mouseout);
            document.removeEventListener('mouseup', mouseup);
            document.removeEventListener('mouseleave', mouseleave);
            document.removeEventListener('contextmenu', contextmenu);
        }
    }, [appOn, chooseOn]);
    // 选择状态中，显示鼠标跟随块
    return <div
        className="fluffy-mouseTracker"
        style={{ left: `${(coord[0] + 5)}px`, top: `${(coord[1] + 10)}px`, backgroundColor: '#4CAF50' }}
    ></div >
}

const Mark = () => {
    const { state, dispatch } = useContext(HostContext);
    const { appOn } = state;
    return <mark>{appOn ? '开' : '关'}</mark>
}

render(<Host />, host);
