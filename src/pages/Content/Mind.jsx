import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, Fragment, createRef } from 'react';
import ReactDOM, { render } from 'react-dom';
import G6 from '@antv/g6';
import KeyCode from '@/utils/KeyCode.js';
import { removeClass, addClass, getEvalRoot } from '@/utils';

const log = console.log;
const preventDefault = (e) => e.preventDefault();
const toolbar = new G6.ToolBar();
const data = {
    // 点集
    nodes: [
        {
            id: 'node1', // String，该节点存在则必须，节点的唯一标识
            x: 100, // Number，可选，节点位置的 x 值
            y: 200, // Number，可选，节点位置的 y 值
        },
        {
            id: 'node2', // String，该节点存在则必须，节点的唯一标识
            x: 300, // Number，可选，节点位置的 x 值
            y: 200, // Number，可选，节点位置的 y 值
        },
    ],
    // 边集
    // edges: [
    //     {
    //         source: 'node1', // String，必须，起始点 id
    //         target: 'node2', // String，必须，目标点 id
    //     },
    // ],
};
const CustomNode = forwardRef(({ onChangeSize }, ref) => {
    const wrapRef = useRef();
    const [wrapSize, setWrapSize] = useState(null);
    const [data, setData] = useState({});
    const updateSize = () => wrapRef?.current && setWrapSize({
        width: wrapRef.current.clientWidth + 10,
        height: wrapRef.current.clientHeight + 10,
    });
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
        update: setData,
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
        >
            <div contentEditable="true"
                onInput={() => {
                    updateSize();
                }}
                style={{ width: 50, padding: 5 }}
            >{data.text}</div>
        </div>
    </foreignObject>
})
// 自定义节点
const registerCustomNode = ({ graph }) => {
    const nodeRefs = {};
    return G6.registerNode(
        'dom-node',
        {
            options: {
                stateStyles: {
                    hover: {},
                    selected: {},
                },
            },
            draw: (cfg, group) => {
                log(cfg.width, 'draw')
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
                            graph.updateItem(String(cfg.id), {
                                width: wrapSize.width,
                                height: wrapSize.height,
                                //  设置size值（用于布局）
                                // size: 100
                            }, false)
                            // 调整布局
                            // graph.layout();
                        }
                    }} />, wrap.cfg.el);
                return dragRect
            },
            afterDraw: (cfg, group, shape) => {
            },
            update: (cfg, item) => {
                // 更新对应node的配置项（找到对应的nodeRef）
                log(cfg, item, 'update')
            },
            setState: (name, value, item) => {
            }
        },
        'react',
    );
}
G6.registerBehavior('custom-drag', {
    getEvents() {
        return {
            'node:dragstart': 'ondragstart'
        };
    },
    ondragstart(e) {
        log(e)
        // const graph = this.graph;
        // const canvas = graph.get('canvas');
        // // 判断点击目标是否canvas
        // if (e.originalEvent.target === canvas.cfg.el) {
        //     // 新增节点
        //     parent.addNode({
        //         type: 'rect-xml',
        //         x: e.canvasX,
        //         y: e.canvasY
        //     });
        // }
    }
});
export default ({ on }) => {
    const graphRef = useRef();
    useEffect(() => {
        const graph = new G6.Graph({
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
                    'custom-drag'
                ],
                edit: ['click-select']
            },
            defaultNode: {
                type: 'dom-node',
                width: 1,
                height: 1,
                size: [50, 50],
            },
        })
        registerCustomNode({
            graph: graph,
            // Node,
            // ...nodeProps,
        });
        graph.data(data);
        graph.render();
        // graph.setMode('edit');
    }, [])
    return <form
        tabIndex="0"
        ref={graphRef}
        className={`fluffy-mind ${on ? '' : 'fluffy-mind-hide'}`}
        onFocus={e => document.addEventListener('contextmenu', preventDefault)}
        onBlur={e => document.removeEventListener('contextmenu', preventDefault)}
    ></form>
}