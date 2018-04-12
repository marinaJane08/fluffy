// const element = (
//     <h1>
//         Hello!
//     </h1>
// );

// ReactDOM.render(
//     element,
//     document.getElementById('app')
// );
localforage.iterate((value, key, iterationNumber) => {
    let div=document.createElement('div');
    div.setAttribute('class','item')
    let a = document.createElement('a');
    a.href=a.innerHTML =key;
    let p = document.createElement('p');
    p.innerHTML = `:::::${JSON.stringify(value)}`;
    div.appendChild(a);
    div.appendChild(p);
    document.getElementById('app').appendChild(div);
});