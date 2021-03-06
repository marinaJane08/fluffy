import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, Fragment, createRef, useContext } from 'react';
import ReactDOM, { render } from 'react-dom';
import G6 from '@antv/g6';
import HostContext from './store';
import KeyCode from '@/utils/KeyCode.js';
import { removeClass, addClass, getEvalRoot, getTimeStamp } from '@/utils';

const log = console.log;
const preventDefault = (e) => e.preventDefault();
const toolbar = new G6.ToolBar();
const staticData = {
    // 点集
    nodes: [
        {
            id: 'node1', // String，该节点存在则必须，节点的唯一标识
            x: 100, // Number，可选，节点位置的 x 值
            y: 200, // Number，可选，节点位置的 y 值
            data: { text: 'no1' }
        },
        {
            id: 'node2', // String，该节点存在则必须，节点的唯一标识
            x: 300, // Number，可选，节点位置的 x 值
            y: 200, // Number，可选，节点位置的 y 值
        },
    ],
    // 边集
    edges: [
        {
            source: 'node1', // String，必须，起始点 id
            target: 'node2', // String，必须，目标点 id
        },
    ],
};
const CustomNode = forwardRef(({ onChangeSize, onClick, data = {}, onUpdateData }, ref) => {
    const wrapRef = useRef();
    const [wrapSize, setWrapSize] = useState(null);
    const [text, setText] = useState(data.text);
    const updateSize = () => wrapRef?.current && setWrapSize({
        width: wrapRef.current.clientWidth + 10,
        height: wrapRef.current.clientHeight + 10,
    });
    useEffect(() => {
        setText(data.text);
    }, [data.text]);
    useEffect(() => {
        // 容器初始化更新size
        // setTimeout(() => {
        // 加定时器等待渲染（包含Input.TextArea组件时，高度会变化）
        updateSize()
        // }, 1);
    }, [wrapRef]);
    useEffect(() => {
        wrapSize && onChangeSize(wrapSize);
    }, [wrapSize]);
    useImperativeHandle(ref, () => ({
        update: () => { },
    }));
    return <foreignObject
        // position用于布局控制，overflow设置才能显示内容，padding设置内容边缘
        style={{ overflow: 'initial', position: 'relative', padding: 5 }}
    >
        <div
            ref={wrapRef}
            style={{
                overflow: 'visible', display: 'block', position: 'absolute',
                width: 'auto', wordBreak: 'keep-all',
                userSelect: 'none', cursor: 'default',
                boxShadow: 'rgb(170, 170, 170) 1px 2px 6px'
            }}
            onClick={onClick}
        >
            <div
                suppressContentEditableWarning
                contentEditable="true"
                onInput={(e) => {
                    updateSize();
                }}
                onBlur={() => {
                    onUpdateData({ text })
                }}
                style={{ width: 50, padding: 5 }}
            >{text}</div>
        </div>
    </foreignObject>
})

// 自定义节点
const registerCustomNode = ({ graph }) => {
    const nodeRefs = {};
    return G6.registerNode(
        'dom-node',
        {
            draw: (cfg, group) => {
                let dragRect = group.addShape('rect', {
                    attrs: {
                        width: cfg.width,
                        height: cfg.height,
                        stroke: 'white',
                        lineWidth: 10,
                    },
                    capture: false,
                    draggable: true,
                });
                let wrap = group.addGroup({ capture: false, draggable: true });
                render(<CustomNode
                    ref={ref => { if (ref) nodeRefs[cfg.id] = ref }}
                    onChangeSize={(wrapSize) => {
                        if (cfg.width !== wrapSize.width || cfg.height !== wrapSize.height) {
                            // 更新keyShape的宽高
                            dragRect.attr({
                                width: wrapSize.width,
                                height: wrapSize.height,
                            });
                            // 更新数据
                            graph.updateItem(cfg.id, {
                                width: wrapSize.width,
                                height: wrapSize.height,
                                //  设置size值（用于布局）
                                // size: 100
                            }, false)
                            // 调整布局
                            // graph.layout();
                        }
                    }}
                    onClick={() => {
                        graph.setItemState(cfg.id, 'active', true);
                    }}
                    data={cfg.data}
                    onUpdateData={(data) => {
                        graph.updateItem(cfg.id, {
                            data: { ...cfg.data, ...data }
                        }, false)
                    }}
                />, wrap.cfg.el);
                return dragRect
            },
            afterDraw: (cfg, group, shape) => {
            },
            update: (cfg, item) => {
                // 更新对应node的配置项（找到对应的nodeRef）
            },
            setState: (name, value, item) => {
                const dragRect = item.getKeyShape();
                switch (name) {
                    case 'active':
                        if (value === true) {
                            dragRect.attr({
                                stroke: 'blue',
                            });
                        } else {
                            dragRect.attr({
                                stroke: 'white',
                            });
                        }
                        break;
                    default:
                        break;
                }
            }
        },
        'react',
    );
}
export default forwardRef(({ on, data }, ref) => {
    const { state, dispatch } = useContext(HostContext);
    const graphRef = useRef();
    const graph = useRef();
    // 双击画布新增节点
    G6.registerBehavior('add-node', {
        getEvents() {
            return {
                'canvas:dblclick': 'onCanvasDblClick'
            };
        },
        onCanvasDblClick(e) {
            const canvas = graph.current.get('canvas');
            // 坐标转换（平移缩放后会改变）
            let point = graph.current.getPointByCanvas(e.canvasX, e.canvasY);
            // 判断点击目标是否canvas
            if (e.originalEvent.target === canvas.cfg.el) {
                // 新增节点
                graph.current.addItem('node', {
                    id: getTimeStamp(),
                    x: point.x,
                    y: point.y
                });
            }
        }
    });
    // 高亮节点和边
    G6.registerBehavior('active-item', {
        getDefaultCfg() {
            return {
                multiple: false,// 是否可以多选
            };
        },
        getEvents() {
            return {
                'node:click': 'onNodeClick',
                'edge:click': 'onEdgeClick',
                'canvas:click': 'onCanvasClick',
                'keydown': 'onKeyDown',
                'keyup': 'onKeyUp',
            };
        },
        onNodeClick(e) {
            const item = e.item;
            if (item.hasState('active')) {
                graph.current.clearItemStates(item, 'active');
                return;
            }
            if (!this.multiple) {
                this.removeNodesState();
            }
            graph.current.setItemState(item, 'active', true);
        },
        onEdgeClick(e) {
            const item = e.item;
            if (item.hasState('active')) {
                graph.current.clearItemStates(item, 'active');
                return;
            }
            if (!this.multiple) {
                this.removeEdgesState();
            }
            graph.current.setItemState(item, 'active', true);
        },
        onCanvasClick(e) {
            if (this.shouldUpdate(e)) {
                this.removeNodesState();
                this.removeEdgesState();
            }
        },
        onKeyDown(e) {
            if (this.shouldUpdate(e)) {
                switch (e.keyCode) {
                    case KeyCode.CONTROL:
                        // 允许多选
                        this.multiple = true;
                        break;
                    default:
                        break;
                }
            }
        },
        onKeyUp(e) {
            if (this.shouldUpdate(e)) {
                switch (e.keyCode) {
                    case KeyCode.CONTROL:
                        // 去除多选
                        this.multiple = false;
                        break;
                    default:
                        break;
                }
            }
        },
        removeNodesState() {
            // 移除高亮
            graph.current.findAllByState('node', 'active').forEach(node => {
                graph.current.clearItemStates(node, 'active');
            });
        },
        removeEdgesState() {
            // 移除高亮
            graph.current.findAllByState('edge', 'active').forEach(edge => {
                graph.current.clearItemStates(edge, 'active');
            });
        },
    });
    const addNode = (type, cfg = {
        id: getTimeStamp(),
    }) => {
        // 新增节点
        let activeNode = graph.current.findAllByState('node', 'active');
        // 当前只有一个高亮节点
        if (activeNode.length > 0) {
            activeNode = activeNode[0];
            if (type === 'sub') {
                let sorceModel = activeNode.getModel();
                // 新增子节点
                let newNode = graph.current.addItem('node', { x: sorceModel.x, y: sorceModel.y, ...cfg });
                // 添加子节点连线
                graph.current.addItem('edge', {
                    source: sorceModel.id,
                    target: newNode.getModel().id,
                    type: 'line',
                });
            } else if (type === 'peer') {
                let parentNodes = activeNode.getNeighbors('source');
                log('该节点没有父节点')
                if (parentNodes.length > 0) {
                    let sorceModel = parentNodes[0].getModel();
                    // 新增同级节点
                    let newNode = graph.current.addItem('node', { x: sorceModel.x, y: sorceModel.y, ...cfg });
                    // 添加同级节点连线
                    graph.current.addItem('edge', {
                        source: sorceModel.id,
                        target: newNode.getModel().id,
                        type: 'line',
                    });
                }
            }
            // graph.layout();
        } else {
            graph.current.addItem('node', cfg);
        }
    }
    // 新增、删除选中节点
    G6.registerBehavior('operate-item', {
        getEvents() {
            return {
                'keyup': 'onKeyUp',
            };
        },
        onKeyUp(e) {
            if (this.shouldUpdate(e)) {
                switch (e.keyCode) {
                    case KeyCode.BACK:
                        // 删除高亮节点
                        this.removeNodes();
                        // 删除高亮连接
                        this.removeEdges();
                        preventDefault(e);
                        break;
                    case KeyCode.TAB:
                        // 新增子节点
                        addNode('sub');
                        preventDefault(e);
                        break;
                    case KeyCode.ENTER:
                        // 新增同级节点
                        addNode('peer');
                        preventDefault(e);
                        break;
                    default:
                        break;
                }
            }
        },
        removeNodes() {
            // 删除高亮节点
            graph.current.findAllByState('node', 'active').forEach(node => {
                graph.current.removeItem(node);
            });
        },
        removeEdges() {
            // 删除高亮连接
            graph.current.findAllByState('edge', 'active').forEach(edge => {
                graph.current.removeItem(edge);
            });
        },
    });
    useImperativeHandle(ref, () => ({
        removeNodes: (id) => {
            graph.current.removeItem(id);
        },
        addNodes: (cfg) => {
            addNode('sub', cfg);
        }
    }));
    useEffect(() => {
        graph.current = new G6.Graph({
            container: ReactDOM.findDOMNode(graphRef.current),
            renderer: 'svg',
            width: graphRef.current.clientWidth,
            height: graphRef.current.clientHeight,
            enabledStack: true,
            animate: true,
            plugins: [toolbar],
            modes: {
                default: [
                    'zoom-canvas',
                    {//节点可拖拽
                        type: 'drag-node',
                        shouldBegin(e) {
                            // 按下shift键表示在创建边
                            if (e.originalEvent.shiftKey) {
                                return false;
                            }
                            return true;
                        }
                    },
                    {//拖拽连线
                        type: 'create-edge',
                        trigger: 'drag',
                        key: 'shift',
                        shouldEnd(e) {
                            const edges = e.item.getEdges();
                            let targetNodeId = e.item.getModel().id;
                            // 防止loop（连自己）
                            if (targetNodeId === this.source) {
                                return false;
                            }
                            let hasConnect = false;
                            // 已有边时不重复创建
                            edges.map(item => {
                                let edgeModel = item.getModel();
                                if (edgeModel.source === this.source || edgeModel.target === this.source) {
                                    hasConnect = true;
                                }
                            });
                            if (hasConnect) {
                                return false;
                            }
                            return true;
                        }
                    },
                    'drag-canvas',
                    'add-node',
                    'active-item',
                    'operate-item'
                ],
                edit: ['click-select']
            },
            defaultNode: {
                type: 'dom-node',
                x: 0,
                y: 0,
                width: 1,
                height: 1,
                size: [50, 50],
            },
            defaultEdge: {
                style: {
                    stroke: '#b8ef70',
                    lineWidth: 2
                },
            },
            // 边不同状态下的样式集合
            edgeStateStyles: {
                // 鼠标点击边，即 click 状态为 true 时的样式
                active: {
                    stroke: '#71cb2d',
                    lineWidth: 3
                },
            },
        })
        registerCustomNode({
            graph: graph.current,
        });
        graph.current.data(data);
        graph.current.render();

        graph.current.on('afteradditem', (e) => {
            dispatch({ type: 'peerCommunicate', payload: { target: 'Mark', type: 'addNodes', marks: graph.current.save() } });
            // 调用layout或者changeData重新进行布局
            // this.graph.layout(this.saveData());
            // 聚焦新增的节点
            // this.graph.focusItem(e.item);
        });
        graph.current.on('afterremoveitem', (e) => {
            dispatch({ type: 'peerCommunicate', payload: { target: 'Mark', type: 'removeNodes', id: e.item.id, marks: graph.current.save() } });
        });
    }, []);
    useEffect(() => {
        graph.current.changeData(data);
    }, [data.nodes, data.edges]);
    return <form
        tabIndex="0"
        ref={graphRef}
        className={`fluffy-mind ${on ? '' : 'fluffy-mind-hide'}`}
        onFocus={e => document.addEventListener('contextmenu', preventDefault)}
        onBlur={e => document.removeEventListener('contextmenu', preventDefault)}
    ></form>
})