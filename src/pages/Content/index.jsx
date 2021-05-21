import React, { useState, useEffect, Fragment, useCallback, useReducer, useRef, useContext } from 'react';
import { render } from 'react-dom';
import { removeClass, addClass, getEvalRoot, getTimeStamp, formatDuration, findElParent, copyRemoveContents } from '@/utils';
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
document.body.appendChild(mock);

// 容器
let host = document.createElement('div');
document.body.appendChild(host);

// app的全局数据
const HostContext = React.createContext();

const Host = () => {
    const [state, dispatch] = useReducer((state, action) => {
        switch (action.type) {
            case 'toggleAppOn':
                return {
                    ...state,
                    appOn: action.payload
                }
            case 'toggleChoose':
                if (action.payload) {
                    // 清除原先root的样式
                    state.root && removeClass(state.root, 'fluffy-root');
                }
                return {
                    ...state,
                    chooseOn: action.payload
                }
            case 'changeRoot':
                if (action.payload) {
                    // 添加root样式
                    addClass(action.payload, 'fluffy-root');
                } else {
                    state.root && addClass(state.root, 'fluffy-root');
                }
                return {
                    ...state,
                    chooseOn: false,
                    root: action.payload
                }
            default:
                return state;
        }
    }, {
        appOn: true,
        chooseOn: false,
        root: null
    });
    const { appOn, chooseOn } = state;
    const showHost = appOn && !chooseOn;

    useEffect(() => {
        const handler = {
            on: (newValue) => {
                dispatch({ type: 'toggleAppOn', payload: newValue });
            }
        }
        chrome.storage.onChanged.addListener((changes, namespace) => {
            for (let key in changes) {
                handler[key] && handler[key](changes[key].newValue, changes[key].oldValue);
            }
        });
        // 获取初始化的on值
        chrome.storage.sync.get({ on: true }, (items) => {
            dispatch({ type: 'toggleAppOn', payload: items.on });
        });
    }, [])

    return <HostContext.Provider value={{ state, dispatch }}>
        {showHost
            ? <div className="fluffy-operateBtn">
                <button onClick={dispatch.bind(null, { type: 'toggleChoose', payload: !chooseOn })}>选择容器</button>
            </div>
            : null
        }
        <ChooseRoot />
        <Mark />
    </HostContext.Provider>
}

// 选择根容器
const ChooseRoot = () => {
    const { state, dispatch } = useContext(HostContext);
    const { appOn, chooseOn } = state;
    const [coord, setCoord] = useState([-100, -100]);
    const on = appOn && chooseOn;
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
        if (on) {
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
    }, [on]);
    // 鼠标移出恢复样式
    const mouseout = useCallback((evt) => {
        if (on && canChoose(evt)) {
            removeHoverStyle(evt.target);
        }
    }, [on]);
    // 鼠标抬起恢复样式、选中元素
    const mouseup = useCallback((evt) => {
        if (on && canChoose(evt)) {
            removeHoverStyle(evt.target);
            hoverTarget.current = null;
            // 设置root
            dispatch({ type: 'changeRoot', payload: evt.target });
        }
    }, [on]);
    // 鼠标移出视区
    const mouseleave = useCallback(() => {
        if (on) {
            setCoord([-100, -100]);
        }
    }, [on]);
    // 右键退出
    const contextmenu = useCallback((evt) => {
        if (on) {
            evt.preventDefault();
            removeHoverStyle(hoverTarget.current);
            hoverTarget.current = null;
            setCoord([-100, -100]);
            dispatch({ type: 'toggleChoose', payload: false });
        }
    }, [on]);
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
    }, [on]);
    // 选择状态中，显示鼠标跟随块
    return <div
        className="fluffy-mouseTracker"
        style={{ left: `${(coord[0] + 5)}px`, top: `${(coord[1] + 10)}px`, backgroundColor: '#4CAF50' }}
    ></div >
}

const Mark = () => {
    const { state, dispatch } = useContext(HostContext);
    const { appOn, chooseOn, root } = state;
    const [sl, setSl] = useState(null);//selection对象
    const on = Boolean(appOn && !chooseOn && root);
    const mousedown = useCallback((evt) => {//鼠标落
        if (on) {
            // 清空鼠标落下前已选中的文字
            // sl && sl.removeAllRanges();
        }
    }, [on]);
    const mouseup = useCallback((evt) => {//鼠标起
        if (on) {
            let sl = window.getSelection();
            let str = sl.toString();
            if (str) {
                let range = sl.getRangeAt(0);// range对象
                // markRange();//废弃（因为useCallback闭包作用所以调用外部函数时依赖不能更新，故直接写于此处）
                // 包裹元素
                let wrap = document.createElement("a");
                wrap.className = `fluffy-itemWrap`;
                // 备份元素
                let origin = document.createElement("div");
                origin.className = 'fluffy-origin';
                // 删除元素
                let del = document.createElement("div");
                del.className = 'fluffy-del';

                // 添加mark内容
                wrap.innerHTML = `<mark spellcheck="false" data-value="${str}">${str}</mark>`;
                // 判断选区的开头或者结尾有没有wrap，有的话扩大选区到该wrap，并且将该wrap作为更新对象
                let endMarkWrap = findElParent(range.endContainer, (node) => node.className && node.className.indexOf('fluffy-itemWrap') > -1);
                let startMarkWrap = findElParent(range.startContainer, (node) => node.className && node.className.indexOf('fluffy-itemWrap') > -1);
                if (startMarkWrap) {
                    // 选区范围框住该mark
                    range.setStartBefore(startMarkWrap);
                }
                if (endMarkWrap) {
                    range.setEndAfter(endMarkWrap);
                }
                // 清空整个选区内容
                let cloneContents = range.cloneContents(),
                    // cloneChild = cloneContents.childNodes;
                    extractContents = range.extractContents(),
                    cloneChild = extractContents.childNodes;
                Array.from(cloneChild).map(item => {
                    origin.appendChild(item);
                })
                restoreMarks(origin);
                wrap.appendChild(origin);
                wrap.appendChild(del);
                range.insertNode(wrap);
                // del.addEventListener('click', delItem.bind(null, wrap));
            }
            // sl && sl.removeAllRanges();
        }
    }, [on]);
    const restoreMarks = (item) => {
        if (item.children) {
            const fluffyItems = Array.from(item.children).filter(i_item => restoreMarks(i_item))
            fluffyItems.map(i_item => {
                delItem(i_item)
            })
        }
        return item.className.indexOf('fluffy-itemWrap') > -1 ? item : false
    }
    const delItem = (mark) => {//删除mark
        let child = Array.from(copyRemoveContents(mark.cloneNode(true)).childNodes)
        if (child.length === 3) {
            mark.outerHTML = child[1].innerHTML;
        }
    }
    useEffect(() => {
        document.addEventListener('mousedown', mousedown);
        document.addEventListener('mouseup', mouseup);
        return () => {
            document.removeEventListener('mousedown', mousedown);
            document.removeEventListener('mouseup', mouseup);
        }
    }, [on]);
    return <mark></mark>
}

render(<Host />, host);
