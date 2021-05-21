import { useRef, useEffect } from 'react';

// moment.locale('zh-cn');
// window.formatDuration = formatDuration;

// 找共同的根元素
export const findRoot = (next, prev) => {
    if (!next) {
        return null;
    } else if (!prev) {
        return next.parentNode;
    } else if (next && next.contains(prev)) {
        return next;
    } else {
        return this.findRoot(next.parentNode, prev);
    }
}

// 递归元素找到itemWrap根元素
export const findElParent = (node, isEl = () => false) => {
    if (isEl(node)) {
        return node
    } else if (node.parentNode) {
        return findElParent(node.parentNode, isEl);
    } else {
        return undefined
    }
}

// 是否包含该元素
export const isChild = (target, parent) => {
    if (parent && parent.contains(target)) {
        return true;
    } else {
        return false;
    }
}
// 找到元素的根路径（返回可用eval直接获取的值）
export const getEvalRoot = (el) => {
    let matched = [];
    let child = el;
    while (child.parentNode !== null) {
        for (let index in child.parentNode.children) {
            if (child.parentNode.children[index] === child) {
                matched.push(index);
            }
        }
        child = child.parentNode;
    }
    let str = "document.body";
    for (let i = matched.length - 3; i >= 0; i--) {
        str += `.children[${matched[i].substr(-1, 1)}]`;
    }
    return str
}
// 添加元素类名
export const addClass = (ele, name) => {
    if (name) {
        //判断该dom有没有class，有则在原class基础上增加，无则直接赋值
        if (ele.className) {
            ele.className += ele.className.indexOf(name) !== -1 ? '' : ` ${name}`;
        } else {
            ele.className = name;
        }
    }
}
// 删除元素类名
export const removeClass = (ele, name) => {
    if (name instanceof RegExp) {
        ele.className = ele.className.replace(name, '');
    } else {
        //将className属性转为数组
        let classArr = ele.className.split(" ");
        //将符合条件的class类删除
        ele.className = classArr.filter(item => item !== name).join(" ");
    }
}
// 获取元素style属性值
export const getStyle = (obj, styleName) => {
    if (obj.currentStyle) {
        return obj.currentStyle[styleName];
    } else {
        return getComputedStyle(obj, false)[styleName];
    }
}
// 递归获取某元素到顶部的距离
export const getElementToPage = (el, dir = 'offsetTop') => {
    if (el.offsetParent) {
        return this.getElementToPage(el.offsetParent, dir) + el[dir]
    }
    return el[dir]
}
// 时间戳
export const getTimeStamp = () => new Date().getTime()
/**
 * 格式化时长
 * @param {moment时长} duration 
 * @param {格式化模版} format 
 * @param {是否带0前缀} showZero 
 * @param {是否显示头} showBeforeNull 
 * @param {是否显示尾} showAfterNull 
 */
export const formatDuration = (obj = {}) => {
    let { duration, format = 'h时m分s秒', showZero = true, showBeforeNull = true, showAfterNull = true } = obj;
    let opt = [
        { key: "y", value: duration.years() },// 年
        { key: "m", value: duration.months() },// 月
        { key: "d", value: duration.days() },// 日
        { key: "h", value: duration.hours() },// 时
        { key: "m", value: duration.minutes() },// 分
        { key: "s", value: duration.seconds() },// 秒
    ];
    let timeString = '';
    // 头尾占位
    let startIndex, endIndex;
    // 从最后一个单位开始匹配
    opt.reverse().map((item, index) => {
        // 单位值不为空
        if (item.value) {
            // 没有结束占位时，设置结束占位
            if (!endIndex) {
                endIndex = index;
            } else {
                // 更新开始占位
                startIndex = index;
            }
        }
        return item
    }).filter((item, index) => {
        item.keyIndex = format.lastIndexOf(item.key);
        if (item.keyIndex > -1) {
            // 是否可显示
            let canShow = true;
            // 当数值为空时
            if (item.value === 0) {
                // 不显示头或者不显示尾时
                if (!showBeforeNull || !showAfterNull) {
                    if (!showBeforeNull && !showAfterNull) {
                        // 同时不显示
                        if (index < endIndex || index > startIndex) canShow = false;
                    } else if (!showAfterNull) {
                        // 不显示尾
                        if (index < endIndex) canShow = false;
                    } else {
                        // 不显示头
                        if (index > startIndex) canShow = false;
                    }
                }
            }
            if (canShow) {
                // 带0前缀判断
                let itemVlaue = (showZero && item.value < 10) ? '0' + item.value : item.value;
                // 替换匹配字符串
                timeString = format.slice(item.keyIndex).replace(item.key, itemVlaue) + timeString;
            }
            // 去除已经匹配的部分
            format = format.slice(0, item.keyIndex);
            return true
        }
        return false
    });
    return timeString
}

//创建一个只包含node内容的节点
export const copyRemoveContents = (node) => {
    let copyRange = document.createRange();
    copyRange.selectNodeContents(node);
    let copyContents = copyRange.cloneContents();
    try {
        // 移除被拷贝的节点
        copyRange.selectNode(node);
        copyRange.extractContents();
    } catch (error) { }
    return copyContents
}