import React from 'react'
import Tile from './Tile';


interface Piece { 
  image: string; 
  x: number; 
  y: number; 
}

const pieces: Piece[] = []; 
const initialFen = " "
//TODO: have an approach which correctly adds pieces to the board 


const maxFile = 8;
const maxRank = 8;


export default function Chessboard() { 

    let board = []; 
    let count = 0 
    for(let j = maxFile - 1; j >= 0 ; j--){ 
        count += 1
        for(let i = 0; i < maxRank; i++){
            count += 1 
            board.push(<Tile count={count} piece={"king_w.png"}/>)
        }
    }
  return (
    <div className='grid grid-cols-8 grid-rows-8 w-[50rem] h-[50rem]'>
        {board}
    </div>
  )
}