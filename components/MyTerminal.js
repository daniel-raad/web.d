import { render } from "react-dom"
import React, { Component } from 'react';
import Terminal from 'terminal-in-react';

class MyTerminal extends Component { 
    render() { 
        return ( 
            <div
                style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh"
            }}
            >
            <Terminal
                color='green'
                backgroundColor='black'
                barColor='black'
                style={{ fontWeight: "bold", fontSize: "1em" }}
                commands={{
                    'github': () => window.open('https://github.com/daniel-raad', '_blank'),
                    'projects': () => window.open('/you', '_blank'), 
                    popup: () => alert('Nosey parker')
                }}
                descriptions={{
                    'github': 'Opens a link to Github',
                    alert: 'alert', popup: 'alert'
                }}
                msg='Hi baby, congratulations on your success my love <3, type help to see what you can do with this! '
            /> 
            </div>
        );
    } 
}

export default MyTerminal