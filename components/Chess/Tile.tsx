import React from 'react'
import Image from 'next/image'
// An interface is used to ensure that the element being passed through 
// is strongly typed 

interface Props { 
    count: number
    piece: string
}

const Tile = ({piece, count}: Props) => {
    if(count % 2 === 0){ 
       return (
            <div className='flex w-[6.25rem] h-[6.25rem] bg-white justify-center items-center'>
                <div className="w-[4rem] h-[4rem]"> 
                    <Image src="/chessImages/king_b.png" width="100" height="100"/>
                </div> 
            </div>
       )
    } else { 
        return (
            <div className='flex w-[6.25rem] h-[6.25rem] bg-green-500 justify-center items-center'>
                <div className="w-[4rem] h-[4rem]"> 
                    <Image src={`/chessImages/${piece}`} width="100" height="100"/>
                </div> 
            </div>
       )
    }
}

export default Tile