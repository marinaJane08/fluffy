import React, { useEffect } from 'react';
import { render } from 'react-dom';
// const the_date = [1, 7, 14, 60]
// let data = [
//   { content: 'first', time: '2020-08-05 15:37:30' },
//   // { content: 'second', time: '2020-3-15 22:34:10' },
// ]
// let rule = (time) => {
//   let cur_data = moment().date().diff(moment(time), 'day', true);
//   console.log(cur_data)
//   if (the_date.includes(cur_data)) {
//     return true
//   } else {
//     return false
//   }
// }
// data.map(item => {
//   if (rule(item.time)) {
//     console.log('复习时间', item.content)
//   }
// })
const NewTab = () => {
    useEffect(() => {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('newTab监听到')
            // sendResponse("newTab返回值");
        })
    }, [])
    return (
        <div className="App">
            <button>开关1</button>
        </div>
    )
}

render(<NewTab />, window.document.querySelector('#app'));

if (module.hot) module.hot.accept();
