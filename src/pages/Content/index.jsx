import React, { useState, useEffect, Fragment, useCallback, useReducer, useRef, useContext } from 'react';
import { render } from 'react-dom';
import { removeClass, addClass, getEvalRoot, getTimeStamp, formatDuration, findElParent, copyRemoveContents } from '@/utils';
import KeyCode from '@/utils/KeyCode.js';
import './index.scss';

const log = console.log;
const dir = console.dir;
window.log = log;
window.dir = dir;
const body = document.body,
    html = body.parentNode;

// 模拟content文章
let mock = document.createElement('div');
mock.innerHTML = `<ul>
<li style="">地址栏<a class="fluffy-itemWrap"><mark spellcheck="false" data-value="内输">内输</mark><div class="fluffy-origin">内输</div><div class="fluffy-del"></div></a>入xizi即可搜索笔记啦</li>
<li>在网页里按住<b>ctrl + alt</b>键即可选择文<div>章容器，鼠标左</div>键选择‘问题’，按住<b>ctrl</b>键并用鼠标左键选择‘答案’</li>
<li>按住<b>ctrl+T</b>或<b>ctrl+N</b>打开新的<div>标<div>签</div>页，完成你</div>的当日任务</li>
</ul>`
// mock.innerHTML = `<ul></ul>`;
document.body.appendChild(mock);

// 容器
let host = document.createElement('div');
document.body.appendChild(host);

// app的全局数据
const HostContext = React.createContext();
// 存储的所有数据
chrome.storage.sync.get(null, (items) => {
    log(items)
})
// chrome.storage.sync.remove(`${location.origin + location.pathname}`);

const Host = () => {
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
            case 'toggleRootShow':
                return {
                    ...state,
                    rootShow: action.payload
                }
            case 'changeData':
                return {
                    ...state,
                    // data是对象，所以此处是合并
                    data: { ...state.data, ...action.payload }
                }
            case 'changeCurMark':
                // 高亮需要清空之前选中的样式
                state.curMark.current && removeClass(state.curMark.current, 'fluffy-markFocus');
                state.curMark.current = action.payload;
                state.curMark.current && addClass(state.curMark.current, 'fluffy-markFocus');
                return {
                    ...state,
                    curMark: state.curMark
                }
            default:
                return state;
        }
    }, {
        appOn: true,//页面开关
        chooseOn: false,//选择容器中
        rootShow: false,//是否显示文章容器
        data: {},//数据
        curMark: useRef(),//当前选中的mark
    });
    const { appOn, chooseOn, rootShow, data } = state;
    // 初始化时、路由改变时，还原root
    const restoreRoot = () => {
        let pathKey = location.origin + location.pathname;
        chrome.storage.sync.get(pathKey, (items) => {
            if (items[pathKey]?.rootPath) {
                try {
                    items[pathKey].root = eval(items[pathKey].rootPath);
                } catch (error) {
                    log('解析容器出错')
                }
            }
            dispatch({ type: 'changeData', payload: items[pathKey] });
            if (appOn) {
                dispatch({ type: 'toggleRootShow', payload: true });
            }
        });
    }
    useEffect(() => {
        if (appOn) {
            restoreRoot();
        } else {
            dispatch({ type: 'toggleChoose', payload: false });
            dispatch({ type: 'toggleRootShow', payload: false });
        }
    }, [appOn]);
    useEffect(() => {
        if (chooseOn) {
            // 选择前将root样式还原
            dispatch({ type: 'toggleRootShow', payload: false });
        } else {
            // 退出选择后加上root样式
            dispatch({ type: 'toggleRootShow', payload: true });
        }
    }, [chooseOn]);
    useEffect(() => {
        // 显示还原样式
        if (rootShow) {
            if (data.root) {
                addClass(data.root, 'fluffy-root');
                if (data.dataHTML) data.root.innerHTML = data.dataHTML;
            }
        } else {
            if (data.root) {
                removeClass(data.root, 'fluffy-root');
                if (data.originHTML) data.root.innerHTML = data.originHTML;
            }
        }
    }, [rootShow, data]);
    useEffect(() => {
        let pathKey = location.origin + location.pathname;
        if (data.root) {
            // 更新数据
            chrome.storage.sync.set({ [pathKey]: data });
        } else {
            // 清除数据
            chrome.storage.sync.remove(pathKey);
        }
    }, [data]);
    useEffect(() => {
        const handler = {
            on: (newValue) => {
                // pop开关联动页面开关
                dispatch({ type: 'toggleAppOn', payload: newValue });
            }
        }
        // 监听存储数据
        chrome.storage.onChanged.addListener((changes, namespace) => {
            for (let key in changes) {
                handler[key] && handler[key](changes[key].newValue, changes[key].oldValue);
            }
        });
        // 获取初始化的on值
        chrome.storage.sync.get({ on: true }, (items) => {
            dispatch({ type: 'toggleAppOn', payload: items.on });
        });

        const tabHandler = {
            // 路由改变
            restoreRoot,
        }
        // 监听后台通信
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            tabHandler[msg.type] && tabHandler[msg.type](msg.payload);
        });
    }, [])
    const showHost = appOn && !chooseOn;
    return <HostContext.Provider value={{ state, dispatch }}>
        {showHost
            ? <div className="fluffy-operateBtn">
                <button onClick={dispatch.bind(null, { type: 'toggleChoose', payload: !chooseOn })}>选择容器</button>
            </div>
            : null
        }
        {appOn && <ChooseRoot />}
        {appOn && <Mark />}
    </HostContext.Provider>
}

// 选择根容器
const ChooseRoot = () => {
    const { state, dispatch } = useContext(HostContext);
    const { chooseOn } = state;
    const [coord, setCoord] = useState([-100, -100]);
    const hoverTarget = useRef();
    const canChoose = (evt) => {//判断能否进行选择
        return evt.target !== body && evt.target !== html;
    }
    const addHoverStyle = (el) => {
        el.style.boxShadow = '#5cb6ff 0px 0px 0px 2px inset';
        el.style.cursor = 'pointer';
        // el.style.border = '2px dashed #8BC34A';
    }
    const removeHoverStyle = (el) => {
        el.style.boxShadow = '';
        el.style.cursor = '';
        // el.style.border = '';
    }
    // 鼠标移动元素浮框
    const mousemove = useCallback((evt) => {
        if (chooseOn) {
            if (canChoose(evt)) {
                hoverTarget.current = evt.target;
                addHoverStyle(evt.target);
            }
            // 鼠标移动更新坐标
            if (evt.target === body || evt.target === html) {
                setCoord([evt.clientX, evt.clientY]);
            } else {
                setCoord([-100, -100]);
            }
        }
    }, [chooseOn]);
    // 鼠标移出恢复样式
    const mouseout = useCallback((evt) => {
        if (chooseOn && canChoose(evt)) {
            removeHoverStyle(evt.target);
        }
    }, [chooseOn]);
    // 鼠标抬起恢复样式、选中元素
    const mouseup = useCallback((evt) => {
        if (chooseOn && canChoose(evt)) {
            removeHoverStyle(evt.target);
            hoverTarget.current = null;
            // 设置root
            let root = evt.target;
            dispatch({ type: 'changeData', payload: { root, rootPath: getEvalRoot(root), originHTML: root.innerHTML } });
            dispatch({ type: 'toggleChoose', payload: false });
        }
    }, [chooseOn]);
    // 鼠标移出视区
    const mouseleave = useCallback(() => {
        if (chooseOn) {
            setCoord([-100, -100]);
        }
    }, [chooseOn]);
    // 右键退出
    const contextmenu = useCallback((evt) => {
        if (chooseOn) {
            evt.preventDefault();
            removeHoverStyle(hoverTarget.current);
            hoverTarget.current = null;
            setCoord([-100, -100]);
            dispatch({ type: 'toggleChoose', payload: false });
        }
    }, [chooseOn]);
    useEffect(() => {
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
    }, [chooseOn]);
    // 选择状态中，显示鼠标跟随块
    return <div
        className="fluffy-mouseTracker"
        style={{ left: `${(coord[0] + 5)}px`, top: `${(coord[1] + 10)}px`, backgroundColor: '#4CAF50' }}
    ></div >
}

const Mark = () => {
    const { state, dispatch } = useContext(HostContext);
    const { data, rootShow, curMark } = state;
    let on = rootShow && data.root;
    useEffect(() => {
        let startIndex = 0;//按下alt键时的index
        let endIndex = 0;//抬起alt键时的index
        let altPressed = false;//按键中

        const keydown = (evt) => {// 键盘落
            if (on) {
                if (evt.keyCode === KeyCode.Alt) {
                    evt.preventDefault();
                    startIndex = window.getSelection().toString().length;
                    altPressed = true;
                }
            }
        };
        const keyup = (evt) => {// 键盘起
            if (on) {
                if (evt.keyCode === KeyCode.Alt) {
                    // point结束
                    evt.preventDefault();
                    endIndex = window.getSelection().toString().length;
                    altPressed = false;
                }
                if (evt.keyCode === KeyCode.BACK) {
                    evt.preventDefault();
                    if (curMark.current) {
                        // 删除高亮
                        restoreMark(curMark.current);
                        // 更新HMTL
                        dispatch({ type: 'changeData', payload: { dataHTML: data.root.innerHTML } });
                    }
                }
            }
        };
        const mouseup = (evt) => {//鼠标起
            if (on) {
                if (altPressed) {
                    endIndex = window.getSelection().toString().length;
                }
                let sl = window.getSelection();
                if (sl.toString()) {
                    let range = sl.getRangeAt(0);// range对象
                    // 包裹元素
                    let wrap = document.createElement("a");
                    wrap.className = `fluffy-itemWrap`;
                    // 备份元素
                    let origin = document.createElement("div");
                    origin.className = 'fluffy-origin';
                    // markId
                    let markId = new Date().getTime();

                    // 判断选区的开头或者结尾有没有wrap，有的话扩大选区到该wrap，并且将该wrap作为更新对象
                    let endMarkWrap = findElParent(range.endContainer, (node) => node?.className?.indexOf('fluffy-itemWrap') > -1);
                    let startMarkWrap = findElParent(range.startContainer, (node) => node?.className?.indexOf('fluffy-itemWrap') > -1);
                    if (startMarkWrap) {
                        // 选区范围框住该mark
                        range.setStartBefore(startMarkWrap);
                    }
                    if (endMarkWrap) {
                        range.setEndAfter(endMarkWrap);
                    }
                    let str = range.toString();
                    // 添加mark内容
                    let sliceEndIndex = startIndex + (endIndex - startIndex);
                    let pointHTML = `<mark spellcheck="false" data-value="${str}">${str.slice(0, startIndex)}<span class="fluffy-point">${str.slice(startIndex, sliceEndIndex)}</span>${str.slice(sliceEndIndex)}</mark>`;
                    wrap.innerHTML = `<mark spellcheck="false" data-value="${str}">${str.slice(startIndex, sliceEndIndex) ? pointHTML : str}</mark>`;
                    // 清空整个选区内容
                    let extractContents = range.extractContents(),
                        cloneChild = extractContents.childNodes;
                    Array.from(cloneChild).map(item => {
                        origin.appendChild(item);
                    })
                    // 还原选中
                    restoreMarks(origin);
                    // mark原文
                    wrap.setAttribute('data-id', markId);
                    range.insertNode(wrap);
                    // 原文添加到root里（便于还原嵌套型mark）
                    origin.id = `fluffy-origin-${markId}`;
                    data.root.appendChild(origin);
                    // 清除选中
                    sl && sl.removeAllRanges();
                    // 更新HMTL
                    dispatch({ type: 'changeData', payload: { dataHTML: data.root.innerHTML } });
                } else {
                    let hasMarkParent = findElParent(evt.target, (node) => node?.className?.indexOf('fluffy-itemWrap') > -1)
                    if (hasMarkParent) {
                        // 高亮选中
                        dispatch({ type: 'changeCurMark', payload: hasMarkParent });
                    } else {
                        // 点击非高亮还原
                        dispatch({ type: 'changeCurMark', payload: null });
                    }
                }
                startIndex = 0;
                endIndex = 0;
            }
        };
        const restoreMarks = (item) => {//还原嵌套的mark
            if (item.children) {
                // 遍历出mark并还原
                const fluffyItems = Array.from(item.children).filter(i_item => restoreMarks(i_item));
                fluffyItems.map(i_item => {
                    restoreMark(i_item);
                })
            }
            return item?.className?.indexOf('fluffy-itemWrap') > -1 ? item : false
        }
        const restoreMark = (mark) => {//还原mark
            let markId = mark.getAttribute('data-id');
            if (markId) {
                let origin = document.getElementById(`fluffy-origin-${markId}`);
                mark.outerHTML = origin.innerHTML;
                origin.remove();
            }
        }
        document.addEventListener('mouseup', mouseup);
        document.addEventListener('keydown', keydown);
        document.addEventListener('keyup', keyup);
        return () => {
            document.removeEventListener('mouseup', mouseup);
            document.removeEventListener('keydown', keydown);
            document.removeEventListener('keyup', keyup);
        }
    }, [on]);
    return <mark></mark>
}

render(<Host />, host);
