import React, { useState } from "react";
import Bars from "./BurgerFont";
export default function Navbar() {
 
  const [showNav, setShowNav] = useState(false);
  let Links = [ 
    {name:"Home", link:"/"}, 
    {name:"About", link:"/about"},
    {name:"Projects", link:"/projects"},
    {name:"Life", link:"/life"},
    {name:"Chess", link:"/chess"}
  ]

  return (
    <nav> 
      <div className=' sticky mx-auto items-center shadow-md w-full top-0 left-0'>
        <div className='md:flex items-center justify-between py-4 md:px-10 px-7'>
          <div className='font-bold text-2xl cursor-default flex items-center font-[Poppins] text-white'>
          رعد 
          </div>
        
          <div onClick={()=>setShowNav(!showNav)} className='text-3xl bg-white absolute right-8 top-4 cursor-pointer md:hidden'>
            <Bars name={showNav ? 'close':'menu'}/> 
          </div>

          <ul className={`md:flex md:items-center md:pb-0 pb-0 absolute md:static md:z-auto left-0 w-full md:w-auto md:pl-0 pl-9 transition-all duration-300 ease-in-out ${showNav ? 'top-20 sticky':'top-[-490px]'}`}>
            {
              Links.map((link)=>(
                <li key={link.name} className='md:ml-8 text-xl md:my-0 my-7'>
                  <a href={link.link} className='text-white p-4 rounded-sm hover:bg-white hover:text-black duration-500'>{link.name}</a>
                </li>
              ))
            }

          </ul>
        </div>
      </div>
    </nav> 
  );
}