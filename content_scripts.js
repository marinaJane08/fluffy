; (function () {
  //用于拦截按住ctrl同时选中文字
  var q = false;
  var a = false;
  var isShow = false;
  //记住鼠标的x坐标
  var x = -1;

  //计数器
  // localforage.getItem('count').then(val=>{
  //   if(!val){
  // localforage.setItem('count', 0)
  //   }
  // })

  var count = document.createElement('b'), current_count = 0;
  count.innerHTML = current_count;
  // var y=-1;
  document.onmousedown = function (evt) {
    x = evt.pageX;
    //   y=evt.pageY;
  }
  document.onmouseup = function (evt) {

    if (q || a) {
      //获取选中的文字存贮数据库中：x坐标，y坐标，是否答案，是否正确
      let str = getSelect();
      if (str) {
        localforage.setItem(str, { x: x, endx: evt.pageX, y: evt.pageY, A: a, check: 0 })
        //将选中文字标注：问题/答案
        evt.target.innerHTML = evt.target.innerHTML.replace(/<\/u>|<u>|<b>|<\/b>/g, "");
        evt.target.innerHTML = evt.target.innerHTML.replace(str, q ? `<b>${str}</b>` : `<u>${str}</u>`);
      }
    }
  }
  // var d=false;
  document.onkeydown = function (evt) {
    //按住q对应键/a对应键
    if (evt.keyCode === 17) {
      q = true;
    } else if (evt.keyCode === 18) {
      a = true;
    }
    // else if(evt.keyCode === 192){
    //   d = true;
    // }
    // switch (evt.keyCode){
    //   case 17:
    //   q = true;
    //   break;
    //   case 18:
    //   a = true;
    //   break;
    //   case 192:
    //   d = true;
    //   break;
    // }
  }
  document.onkeyup = function (evt) {
    //松开q对应键/a对应键
    // if(q && d){
    //   showMask()
    //   d=false;
    // }
    // switch (evt.keyCode){
    //   case 17:
    //   q = false;
    //   break;
    //   case 18:
    //   a = false;
    //   break;
    // }

    if (evt.keyCode === 17) {
      q = false;
    } else if (evt.keyCode === 18) {
      a = false;
    }
    if (evt.ctrlKey && evt.keyCode === 81) {
      //显示隐藏笔记页
      showMask()
    }
  }

  function getSelect() {
    if (window.getSelection) {
      return window.getSelection().toString();
    } else if (document.getSelection) {
      return document.getSelection();
    } else if (document.selection) {
      return document.selection.createRange().text;
    } else {
      return "";
    }
  }
  function addEl(div, key, value, init) {
    // if (value.A) {
    //   //答案提交事件
    //   return React.createElement(
    //     'input',
    //     {
    //       answer: key, 
    //       style: {
    //         position: "absolute",
    //         left: value.x + 'px',
    //         top: value.y + 'px'
    //       },
    //       onChange:handleInput
    //     }
    //   );
    // } else {
    //   return React.createElement(
    //     'u',
    //     {
    //       answer: key, style: {
    //         position: "absolute",
    //         left: value.x + 'px',
    //         top: value.y + 'px'
    //       }
    //     },
    //     key
    //   );
    // }
    let el;
    //创建元素
    if (value.A) {
      el = document.createElement('input');
      el.answer = key;
      el.style = `left:${value.x}px;top:${value.y}px;width:${value.endx - value.x + 10}px;`;
      //答案提交事件
      el.onchange = handleInput;
    } else {
      el = document.createElement('u');
      el.innerHTML = key;
      el.style = `left:${value.x}px;top:${value.y}px;`;
    }
    div.appendChild(el);
    return el;
  }
  function handleInput(evt) {
    //检查答案
    if (evt.target.value === evt.target.answer) {
      evt.target.style.border = 'none';
      localforage.getItem(evt.target.answer).then(val => {
        localforage.setItem(evt.target.answer, { x: val.x, endx: val.endx, y: val.y, A: val.A, check: val.check + 1 });
      });
      evt.target.style.background = 'rgba(0,0,0,0)';
      // localforage.getItem('count').then(val => {
      //   localforage.setItem('count', val + 1)
      current_count++;
      count.innerHTML = current_count;
      // });
    } else if (evt.target.value != '') {

      div.style.opacity = '0.1';
      setTimeout(() => {
        div.style.opacity = '1';
      }, 1000)
    }
  }
  let div = document.createElement('div');
  // var bg=document.createElement('div');
  div.setAttribute('id', 'xiziapp');
  // bg.setAttribute('class','bg')
  div.style.height = document.getElementsByTagName("html")[0].offsetHeight + 'px';
  document.body.appendChild(div);
  // document.body.appendChild(bg)
  //答案个数
  var len = 0;
  //触发第一个输入框的focus事件
  var init = 0;
  function showMask() {
    isShow = !isShow;

    if (isShow) {
      //重置计数器和容器
      // localforage.setItem('count',0);

      // count.innerHTML = 0;
      div.innerHTML = "";
      div.style.height = document.getElementsByTagName("html")[0].offsetHeight + 'px';
      div.style.display = 'block';
      //每次都渲染一次

      div.appendChild(count);
      //发给bg
      if (init === 0) {
        chrome.runtime.sendMessage({ key: location.href }, function (response) {
          console.log(response);
        })

      }
      //将数据库内容渲染
      localforage.iterate((value, key, iterationNumber) => {
        // if (key != 'count') { 
        if (init === 0 && value.A) {
          addEl(div, key, value).focus();
          init++;
        } else {
          addEl(div, key, value)
        }
        len = value.A ? len + 1 : len
        // }
      }).then((result) => {
        // ReactDOM.render(
        //   element,
        //   document.getElementById('app')
        // );
        console.log('数据渲染完成')

      }).catch((err) => {
        console.log(err);
      });
    } else {
      div.style.display = 'none';
      //没有答题，或者没有答案
      if (current_count != 0 && len != 0) {
        chrome.runtime.sendMessage({ key: location.href, val: (current_count / len) * 100 }, function (response) {
          console.log(response);
        });
      }
      current_count = 0;
      count.innerHTML = current_count;
      len = 0;
    }
  }

})(this)