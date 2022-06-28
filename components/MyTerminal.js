import React from 'react';
import Terminal from 'terminal-in-react';


    const MyTerminal = () =>   { 
        return ( 
            <div className="grid place-items-center">
                <Terminal
                    color='purple'
                    backgroundColor='black'
                    barColor='black'
                    style={{ fontWeight: "bold", fontSize: "1.3em" }}
                    commands={{
                        'github': () => console.log(window.open("https://github.com/daniel-raad", '_blank')),
                        'projects': () => console.log(window.open('/projects', '_self')), 
                        'life': () => console.log(window.open('/life', '_self')),
                        'chess': () => console.log(window.open('/chess', '_self')),
                        popup: () => alert('...')
                    }}
                    descriptions={{
                        'github': 'Opens a link to my Github page',
                        'projects': 'my projectss', 
                        'life': 'checkout the blogs', 
                        'chess': 'play some chess',
                        alert: 'alert', popup: 'alert'
                    }} 
                    msg= 'enter help to see what this can do :)'
                /> 
            </div>
        );
    }

export default MyTerminal