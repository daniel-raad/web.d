import React from 'react'
import { projects } from '../../constants/constants'
import PostCard from '../PostCard'
import BackgroundAnimation from '../BgAnimation'

const MyProjects = () => {
  return (
    <div> 
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-10 py-5">
            {projects.map((p, i) => {
                return(
                    <div key={i} className="pb-8"> 
                        <PostCard key={p.title} post={p}/> 
                    </div>
                )
            })}
        </div>
    </div>

  )
}

export default MyProjects