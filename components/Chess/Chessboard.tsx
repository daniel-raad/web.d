import React from 'react'

const maxFile = 8;
const verticalAxis = ['1','2','3','4','5','6','7','8'];
const horizontalAxis = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const maxRank = 8;

export default function Chessboard() { 
    let board = []; 
    let count = 0 
    for(let j = maxFile - 1; j >= 0 ; j--){ 
        count += 1
        for(let i = 0; i < maxRank; i++){
            count += 1 
            if(count % 2 === 0){ 
                board.push(<div className=' w-[6.25rem] h-[6.25rem] bg-white'> [{horizontalAxis[i]}{verticalAxis[j]}]  </div>)
            } else { 
                board.push(<div className=' w-[6.25rem] h-[6.25rem] bg-green-500'> [{horizontalAxis[i]}{verticalAxis[j]}]  </div>)
            }
            
        }
    }
  return (
    <div className='grid grid-cols-8 grid-rows-8  w-[50rem] h-[50rem]'>
        {board}
    </div>
  )
}