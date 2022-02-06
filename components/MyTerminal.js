import React from 'react';
import Terminal from 'terminal-in-react';


    const MyTerminal = () =>   { 
        return ( 
            <div className="flex justify-center">
                <Terminal
                    color='green'
                    backgroundColor='black'
                    barColor='black'
                    style={{ fontWeight: "bold", fontSize: "1.3em" }}
                    commands={{
                        'github': () => console.log(window.open("https://github.com/daniel-raad", '_blank')),
                        'projects': () => console.log(window.open('/projects', '_self')), 
                        'life': () => console.log(window.open('/life', '_self')),
                        popup: () => alert('Hellooo')
                    }}
                    descriptions={{
                        'github': 'Opens a link to Github',
                        alert: 'alert', popup: 'alert'
                    }}
                    msg='Hey, welcome to the page, type help to see what you can do with this!'
                /> 
            </div>
        );
    }

export default MyTerminal