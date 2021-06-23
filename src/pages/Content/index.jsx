import React, { useState, useEffect, Fragment, useCallback, useReducer, useRef, forwardRef, useImperativeHandle, useContext } from 'react';
import { render } from 'react-dom';
import Mind from './Mind';
import HostContext from './store';
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

// 存储的所有数据
chrome.storage.local.get(null, (items) => {
    log(items)
})
// chrome.storage.local.remove(`${location.origin + location.pathname}`);
// chrome.storage.sync.clear();

const Host = () => {
    const mindRef = useRef();
    const markRef = useRef();

    const [state, dispatch] = useReducer((state, action) => {
        let pathKey = location.origin + location.pathname;
        switch (action.type) {
            case 'toggleAppOn':
                if (action.payload) {
                    state.rootShow = true;
                    state.mindOn = true;
                } else {
                    state.chooseOn = false;
                    state.rootShow = false
                    state.mindOn = false
                    state.qiuzOn = false
                }
                return {
                    ...state,
                    appOn: action.payload
                }
            case 'toggleChoose':
                return {
                    ...state,
                    chooseOn: action.payload
                }
            case 'toggleMind':
                return {
                    ...state,
                    mindOn: action.payload
                }
            case 'toggleRootShow':
                return {
                    ...state,
                    rootShow: action.payload
                }
            case 'toggleQuiz':
                // 显示还原Quiz样式
                if (action.payload) {
                    if (state.data.root) {
                        addClass(state.data.root, 'fluffy-quizOn');
                    }
                } else {
                    if (state.data.root) {
                        removeClass(state.data.root, 'fluffy-quizOn');
                    }
                }
                return {
                    ...state,
                    qiuzOn: action.payload
                }
            case 'changeData':
                // data是对象，所以此处是合并
                let data = { ...state.data, ...action.payload };
                if (data.root) {
                    // 更新数据
                    chrome.storage.local.set({ [pathKey]: data });
                } else {
                    // 清除数据
                    chrome.storage.sync.remove(pathKey);
                }
                return {
                    ...state,
                    data
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
            case 'clearData':
                removeClass(state.data.root, 'fluffy-root');
                if (state.data.originHTML) state.data.root.innerHTML = state.data.originHTML;
                return {
                    ...state,
                    rootShow: false,
                    mindOn: false,
                    qiuzOn: false,
                    chooseOn: false,
                    data: { root: null, rootPath: '', originHTML: '', dataHTML: '', marks: { nodes: [], edges: [] } }
                }
            case 'peerCommunicate':
                switch (action.payload.type) {
                    case 'removeNodes':
                        if (action.payload.target === 'Mind') {
                            let markIndex = action.payload.mark.getAttribute('data-index');
                            state.data.marks.nodes.splice(markIndex, 1);
                            mindRef.current.removeNodes(action.payload.mark.getAttribute('data-id'));
                        } else {
                            state.data.marks = action.payload.marks;
                            markRef.current.removeNodes(action.payload.id);
                        }
                        break;
                    case 'addNodes':
                        if (action.payload.target === 'Mind') {
                            mindRef.current.addNodes(action.payload.data);
                        } else {
                            state.data.marks = action.payload.marks;
                        }
                        break;
                    default:
                        break;
                }
                // 保存dataHTML
                state.data.dataHTML = state.data.root?.innerHTML;
                // 更新数据
                chrome.storage.local.set({ [pathKey]: state.data });
                return state;
            default:
                return state;
        }
    }, {
        appOn: false,//页面开关
        chooseOn: false,//选择容器中
        rootShow: false,//是否显示文章容器
        qiuzOn: false,//测试模式
        mindOn: false,//显示脑图
        data: { root: null, rootPath: '', originHTML: '', dataHTML: '', marks: { nodes: [], edges: [] } },//数据
        curMark: useRef(),//当前选中的mark
    });
    const { appOn, chooseOn, rootShow, qiuzOn, mindOn, data } = state;
    const getData = (callback) => {
        let pathKey = location.origin + location.pathname;
        chrome.storage.local.get({ [pathKey]: {} }, (items) => {
            items[pathKey].root = null;
            if (items[pathKey]?.rootPath) {
                try {
                    items[pathKey].root = eval(items[pathKey].rootPath);
                } catch (error) {
                    log('🍎解析容器出错 ')
                }
            }
            callback(items[pathKey]);
        });
    }
    useEffect(() => {
        // 显示还原样式
        if (chooseOn) {
            // 选择前将root样式还原
            dispatch({ type: 'toggleRootShow', payload: false });
        } else {
            // 退出选择后加上root样式
            if (data.root) {
                dispatch({ type: 'toggleRootShow', payload: true });
                dispatch({ type: 'toggleMind', payload: true });
            }
        }
    }, [chooseOn, data]);
    useEffect(() => {
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

        const tabHandler = {
            // 路由改变
            restoreRoot: () => {
                chrome.storage.local.get({ on: true }, (items) => {
                    dispatch({ type: 'toggleAppOn', payload: items.on });
                    getData((data) => {
                        dispatch({ type: 'changeData', payload: data });
                        if (items.on && data.root) {
                            dispatch({ type: 'toggleRootShow', payload: true });
                        }
                    })
                });
            },
        }
        // 监听后台通信
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            tabHandler[msg.type] && tabHandler[msg.type](msg.payload);
        });
    }, []);
    return <HostContext.Provider value={{ state, dispatch }}>
        {!chooseOn
            ? <div className="fluffy-operateBtn">
                <button onClick={dispatch.bind(null, { type: 'toggleAppOn', payload: !appOn })}>{appOn ? '隐藏' : '显示'}</button>
                {appOn ? <Fragment>
                    {!qiuzOn
                        ? <Fragment>
                            <button onClick={dispatch.bind(null, { type: 'toggleChoose', payload: !chooseOn })}>选择容器</button>
                            {data.root && rootShow && <button onClick={dispatch.bind(null, { type: 'clearData' })}>清空数据</button>}
                            {/* {rootShow && <button onClick={dispatch.bind(null, { type: 'toggleMind', payload: !mindOn })}>脑图</button>} */}
                        </Fragment>
                        : null
                    }
                    {data.root && rootShow && <Fragment>
                        <button onClick={dispatch.bind(null, { type: 'toggleQuiz', payload: !qiuzOn })}>测验模式</button>
                        {qiuzOn && <Quiz />}
                    </Fragment>}
                </Fragment>
                    : null
                }
            </div>
            : null
        }
        {/* 传on避免重复渲染 */}
        <Mind on={appOn && !chooseOn && mindOn && data.root && rootShow && !qiuzOn} data={data.marks} ref={mindRef} />
        {appOn && <Mark ref={markRef} />}
        {appOn && <ChooseRoot />}
    </HostContext.Provider>
}

// 高亮
const Mark = forwardRef(({ }, ref) => {
    const { state, dispatch } = useContext(HostContext);
    const { data, rootShow, curMark, qiuzOn } = state;
    let on = rootShow && !qiuzOn && data.root;

    const restoreMark = (mark) => {//还原mark
        if (mark) {
            let markId = mark.getAttribute('data-id');
            if (markId) {
                let origin = document.getElementById(`fluffy-origin-${markId}`);
                mark.outerHTML = origin.innerHTML;
                origin.remove();
            }
        }
    }

    useImperativeHandle(ref, () => ({
        removeNodes: (markId) => {
            let targetMark = document.getElementById(`fluffy-wrap-${markId}`);
            restoreMark(targetMark);
        },
    }));

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
                        // 通知Mind
                        dispatch({ type: 'peerCommunicate', payload: { target: 'Mind', type: 'removeNodes', mark: curMark.current } });
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
                    let wrap = document.createElement("mark");
                    wrap.className = `fluffy-itemWrap`;
                    // 备份元素
                    let origin = document.createElement("div");
                    origin.className = 'fluffy-origin';
                    // markId
                    let markId = getTimeStamp();
                    // 判断选区的开头或者结尾有没有wrap，有的话扩大选区到该wrap，并且将该wrap作为更新对象
                    let endMarkWrap = findElParent(range.endContainer, (node) => node?.className?.indexOf('fluffy-itemWrap') > -1);
                    let startMarkWrap = findElParent(range.startContainer, (node) => node?.className?.indexOf('fluffy-itemWrap') > -1);
                    if (startMarkWrap) {
                        // index要加上扩张的部分
                        startIndex += range.startOffset;
                        endIndex += range.startOffset;
                        // 选区范围开头框住该mark
                        range.setStartBefore(startMarkWrap);
                    }
                    if (endMarkWrap) {
                        // 选区范围结尾框住该mark
                        range.setEndAfter(endMarkWrap);
                    }
                    let str = range.toString();
                    // 添加mark内容
                    let sliceEndIndex = startIndex + (endIndex - startIndex);
                    let pointHTML = `${str.slice(0, startIndex)}<span class="fluffy-point" spellcheck="false" data-value="${str.slice(startIndex, sliceEndIndex)}">${str.slice(startIndex, sliceEndIndex)}</span>${str.slice(sliceEndIndex)}`;
                    wrap.innerHTML = `${str.slice(startIndex, sliceEndIndex) ? pointHTML : str}`;
                    // 清空整个选区内容
                    let extractContents = range.extractContents(),
                        cloneChild = extractContents.childNodes;
                    Array.from(cloneChild).map(item => {
                        origin.appendChild(item);
                    })
                    // 还原选中
                    restoreMarks(origin);
                    // mark原文
                    wrap.id = `fluffy-wrap-${markId}`;
                    wrap.setAttribute('data-id', markId);
                    wrap.setAttribute('data-index', data.marks.nodes.length);
                    range.insertNode(wrap);
                    // 原文添加到root里（便于还原嵌套型mark）
                    origin.id = `fluffy-origin-${markId}`;
                    data.root.appendChild(origin);
                    // 清除选中
                    sl && sl.removeAllRanges();
                    // 更新HMTL和marks
                    dispatch({ type: 'peerCommunicate', payload: { target: 'Mind', type: 'addNodes', data: { id: markId, data: { text: origin.innerText } } } });
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

        if (data.root) data.root.addEventListener('mouseup', mouseup);
        document.addEventListener('keydown', keydown);
        document.addEventListener('keyup', keyup);
        return () => {
            if (data.root) data.root.removeEventListener('mouseup', mouseup);
            document.removeEventListener('keydown', keydown);
            document.removeEventListener('keyup', keyup);
        }
    }, [on, data.marks.nodes]);
    return <mark></mark>
})

// 选择根容器
const ChooseRoot = () => {
    const { state, dispatch } = useContext(HostContext);
    const { chooseOn, data } = state;
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
            // 设置|重置root
            let root = evt.target;
            dispatch({ type: 'changeData', payload: { root, rootPath: getEvalRoot(root), originHTML: root.innerHTML, dataHTML: root.innerHTML, marks: { nodes: [], edges: [] } } });
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

const Quiz = () => {
    const { state, dispatch } = useContext(HostContext);
    const { data, rootShow, curMark, qiuzOn } = state;
    useEffect(() => {
        let allPoint = Array.from(data.root.getElementsByClassName(`fluffy-point`));
        let current = -1;
        allPoint.map(item => {
            // 开启编辑模式（清空内容）
            item.innerHTML = "";
        });
        const checkQuiz = () => {
            if (current <= allPoint.length - 1) {
                let item = allPoint[current];
                let correct = item.getAttribute('data-value'), input = item.innerText;
                // 结果样式
                addClass(item, `fluffy-point-${input === correct ? 'correct' : 'wrong'}`);
                // 关闭编辑
                item.contentEditable = "false";
                item.title = correct;
                jumpNext();
            } else {
                log('测验已结束')
            }
        }
        const jumpNext = () => {
            current += 1;
            if (current <= allPoint.length - 1) {
                let item = allPoint[current];
                // 可编辑并聚焦
                item.contentEditable = "true";
                item.focus();
                item.scrollIntoView();
                if (!oninput) {
                    // 英文输入和中文输入监听
                    let inputLock = false;
                    let correct = item.getAttribute('data-value');
                    item.oninput = () => {
                        if (inputLock) {
                            return;
                        }
                        let input = item.innerText;
                        if (input.length >= correct.length) {
                            // 输入长度和正确答案一致
                            checkQuiz();
                        }
                    }
                    item.addEventListener('compositionstart', (e) => {
                        inputLock = true;
                    });
                    item.addEventListener('compositionend', (e) => {
                        inputLock = false;
                        let input = item.innerText;
                        if (input.length >= correct.length) {
                            // 输入长度和正确答案一致
                            checkQuiz();
                        }
                    });
                }
            }
        }
        jumpNext();

        const keydown = (evt) => {// 键盘起
            if (evt.keyCode === KeyCode.TAB) {
                evt.preventDefault();
                // tab切换下一个
                checkQuiz();
            }
        };
        document.addEventListener('keydown', keydown);

        return () => {
            document.removeEventListener('keydown', keydown);

            // 复原pointHTML
            allPoint.map(item => {
                item.innerHTML = item.getAttribute('data-value');
                item.title = "";
            });
        }
    }, [data.root]);
    return null
}

render(<Host />, host);
