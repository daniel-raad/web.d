import React from 'react'
import { projects } from '../../constants/constants'
import PostCard from '../PostCard'


const MyProjects = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-10 py-5">
        {projects.map((p, i) => {
            return(
                <div className="pb-8"> 
                    <PostCard post={p} key={p.title}/> 
                </div>
            )
        })}
    </div>

  )
}

export default MyProjects