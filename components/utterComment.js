import React, { Component } from 'react';


export default class UtterComments extends Component { 
    constructor(props){ 
        super(props); 
        this.commentBox = React.createRef(); 
    }

    componentDidMount(){ 
        let scriptEl = document.createElement("script");
        scriptEl.setAttribute("src", "https://utteranc.es/client.js");
        scriptEl.setAttribute("crossorigin", "anonymous"); 
        scriptEl.setAttribute("async", true); 
        scriptEl.setAttribute("repo", "daniel-raad/web-comments");
        scriptEl.setAttribute("issue-term", "url");
        scriptEl.setAttribute("theme", "github-light");
        this.commentBox.current.appendChild(scriptEl); 
    }

    render(){ 
        return (

            <div className="w-full"> 
                <div ref={this.commentBox}></div>
            </div>
        )
    }
}