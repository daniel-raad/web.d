import React, { Component } from 'react';


export default class GiscusComments extends Component { 
    constructor(props){ 
        super(props); 
        this.commentBox = React.createRef(); 
    }

    componentDidMount(){ 
        let scriptEl = document.createElement("script");
        scriptEl.setAttribute("src", "https://giscus.app/client.js");
        scriptEl.setAttribute("crossorigin", "anonymous"); 
        scriptEl.setAttribute("async", true); 
        scriptEl.setAttribute("data-repo", "daniel-raad/web-comments");
        scriptEl.setAttribute("data-repo-id", "R_kgDOGzIzNw");
        scriptEl.setAttribute("data-mapping", "pathname");
        scriptEl.setAttribute("data-emit-metadata", "0");
        scriptEl.setAttribute("data-input-position", "bottom");
        scriptEl.setAttribute("data-lang", "en");
        scriptEl.setAttribute("data-category", "Announcements");
        scriptEl.setAttribute("data-category-id", "DIC_kwDOGzIzN84CBCT1");
        scriptEl.setAttribute("data-reactions-enabled", "1");
        scriptEl.setAttribute("data-theme", "dark");
        this.commentBox.current.appendChild(scriptEl); 
    }

    render(){ 
        return (

            <div className="w-full mb-20"> 
                <div ref={this.commentBox}></div>
            </div>
        )
    }
}