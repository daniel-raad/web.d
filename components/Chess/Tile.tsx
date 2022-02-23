import React from 'react'

// An interface is used to ensure that the element being passed through 
// is strongly typed 

interface Props { 
    count: number
}

const Tile = ({count}: Props) => {
    if(count % 2 === 0){ 
       return <div className=' w-[6.25rem] h-[6.25rem] bg-white'></div>
    } else { 
       return <div className=' w-[6.25rem] h-[6.25rem] bg-green-500'> </div>
    }
}

export default Tile