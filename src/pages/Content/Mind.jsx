import React, { useEffect, useRef, useState, forwardRef, Fragment, createRef } from 'react';
import ReactDOM, { render } from 'react-dom';
import G6 from '@antv/g6';
import KeyCode from '@/utils/KeyCode.js';
import { removeClass, addClass, getEvalRoot } from '@/utils';

const log = console.log;
const preventDefault = (e) => e.preventDefault();
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
    edges: [
        {
            source: 'node1', // String，必须，起始点 id
            target: 'node2', // String，必须，目标点 id
        },
    ],
};
// 自定义节点
const registerCustomNode1 = ({ graph, Node, ...nodeProps }) => {
    const nodeRefs = {};
    G6.registerNode(
        'dom-node',
        {
            jsx: (cfg) => `<rect
                style={{ width: ${cfg.width}, height: ${cfg.height}, fill: 'rgba(0,0,0,0)', stroke: 'none', radius: [5, 5, 5, 5], cursor: move }}
                keyshape="true"
                name="rect"
            />`,
            afterDraw: (cfg, group, shape) => {
                let wrap = group.addGroup({ capture: false });
                const nodeRef = createRef();
                // 渲染dom
                render(<Node
                    {...nodeProps}
                    cfg={cfg}
                    ref={nodeRef}
                    onInit={() => {
                        // 初始化推入nodeRef
                        nodeRefs[cfg.id] = nodeRef.current;
                    }}
                    onChangeSize={(wrapSize) => {
                        if (cfg.width !== wrapSize.width || cfg.height !== wrapSize.height) {
                            // 更新keyShape的宽高
                            let dragShape = group.getFirst();
                            dragShape.attr({
                                width: wrapSize.width,
                                height: wrapSize.height,
                            });
                            // 调整布局
                            graph.updateItem(String(cfg.id), {
                                width: wrapSize.width,
                                height: wrapSize.height,
                                //  设置size值（用于布局）
                                size: 100
                            }, false)
                            // graph.layout();
                        }
                    }}
                />, wrap.cfg.el);
                return wrap
            },
            update: (cfg, item) => {
                // 更新对应node的配置项（找到对应的nodeRef）
                nodeRefs[cfg.id] && nodeRefs[cfg.id].update(cfg)
            },
            setState(name, value, item) {
                const group = item.getContainer();
                const shape = group.getFirst(); // 顺序根据 draw 时确定
                if (name === 'active') {
                    if (value) {
                        shape.attr('stroke', '#63abf7');
                    } else {
                        shape.attr('stroke', 'none');
                    }
                } else if (name === 'size') {
                    item.update({ size: value })
                }
            },
        },
        'single-node',
    );
}
const registerCustomNode = ({ graph, Node, ...nodeProps }) => {
    return G6.registerNode(
        'dom-node',
        {
            options: {
                style: {},
                stateStyles: {
                    hover: {},
                    selected: {},
                },
            },
            draw: (cfg, group) => {
                return group.addShape('dom', {
                    attrs: {
                        width: cfg.size[0],
                        height: cfg.size[1],
                        // 传入 DOM 的 html
                        html: `
              <div style="background-color: #fff; user-select: none; border: 2px solid #5B8FF9; border-radius: 5px; width: ${cfg.size[0] - 5
                            }px; height: ${cfg.size[1] - 5}px; display: flex;">
                <div style="height: 100%; width: 33%; background-color: #CDDDFD">
                  <img alt="img" style="line-height: 100%; padding-top: 6px; padding-left: 8px;" src="https://gw.alipayobjects.com/mdn/rms_f8c6a0/afts/img/A*Q_FQT6nwEC8AAAAAAAAAAABkARQnAQ" width="20" height="20" />  
                </div>
                <span style="margin:auto; padding:auto; color: #5B8FF9">${cfg.label}</span>
              </div>
                `,
                    },
                    draggable: true,
                });
            },
        },
        'single-node',
    );
}
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
            modes: {
                default: ['zoom-canvas', 'drag-node'],
                edit: ['click-select']
            },
            defaultNode: {
                type: 'dom-node',
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
    return <Fragment>
        <form
            tabIndex="0"
            ref={graphRef}
            className="fluffy-mind"
            style={{ display: on ? 'block' : 'none' }}
            onFocus={e => document.addEventListener('contextmenu', preventDefault)}
            onBlur={e => document.removeEventListener('contextmenu', preventDefault)}
        ></form>
    </Fragment>
}