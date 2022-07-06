import React from 'react';
import Terminal from 'terminal-in-react';


    const MyTerminal = () =>   { 
        return ( 
            <div className="grid place-items-center">
                <Terminal
                    color='white'
                    backgroundColor='black'
                    barColor='black'
                    style={{ fontWeight: "bold", fontSize: "1.3em" }}
                    commands={{
                        'github': () => console.log(window.open("https://github.com/daniel-raad", '_blank')),
                        'instagram': () => console.log(window.open('https://www.instagram.com/daniel.trd/', '_blank')), 
                        'linkedin': () => console.log(window.open('https://www.linkedin.com/in/daniel-raad-243130172/', '_blank')),
                    }}
                    descriptions={{
                        'github': 'Opens a link to my Github page',
                        'instagram': 'Check out my instagram', 
                        'linkedin': 'Check out my linkedin', 
                    }} 
                    msg= 'enter help to see what this can do :)'
                /> 
            </div>
        );
    }

export default MyTerminal