import React from 'react'
import Tile from './Tile';


function readFen(initialFen) { 

  var fenArr = initialFen.split(/\s+/)
  var positions = fenArr[0]
  let maxFile = 8 
  let maxRank = 8 

  let board = [];  
  var pieceDict = {
    'k' : "king_b.png",
    'K' : "king_w.png", 
    'q' : "queen_b.png", 
    'Q' : "queen_w.png", 
    'b' : "bishop_b.png", 
    'B' : "bishop_w.png", 
    'n' : "knight_b.png", 
    'N' : "knight_w.png", 
    'r' : "rook_b.png", 
    'R' : "rook_w.png",
    'p' : "pawn_b.png", 
    'P' : "pawn_w.png"
  };

  let count = 0;
  for (var i = 0, len = positions.length; i < len; i++) {
    if(positions[i] == '/' ){
      maxRank = maxRank - 1;
      count+=1
    }else if(positions[i] in pieceDict){ 
      console.log(`${count}`)
      console.log(pieceDict[positions[i]])
      board.push(<Tile key={`${count}`} count={count} piece={pieceDict[positions[i]]}/>)
      count += 1;
    } else { 
      for(maxFile; maxFile > 0; maxFile-- ){
        console.log(`${maxRank}, ${maxFile}`)
        board.push(<Tile key={`${count}`} count={count} piece=''/>)
        count += 1;
      }
      maxFile = 8 
    }
  };

  return board

} 


export default function Chessboard() { 
    let initialFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    let board = readFen(initialFen)
  return (
    <div className='grid grid-cols-8 grid-rows-8 w-[50rem] h-[50rem]'>
        {board}
    </div>
  )
}