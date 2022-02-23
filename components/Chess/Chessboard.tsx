import React from 'react'
import Tile from './Tile';

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
            board.push(<Tile count={count}/>)
            
        }
    }
  return (
    <div className='grid grid-cols-8 grid-rows-8  w-[50rem] h-[50rem]'>
        {board}
    </div>
  )
}