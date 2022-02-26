import styled from "styled-components";
import Link from "next/link";
import React, { useState } from "react";
import Bars from "./BurgerFont";

export default function Navbar() {
 
  const [showNav, setShowNav] = useState(false);
  let Links = [ 
    {name:"Home", link:"/"}, 
    {name:"About", link:"/about"},
    {name:"Projects", link:"/projects"},
    {name:"Life", link:"/life"},
  ]

  return (
    // <nav> 
    // <div class="container sticky flex flex-wrap justify-between items-center mx-auto">
    //   <a href="/about" class="flex">
    //   <img src="data:image/svg+xml;charset=utf8,%3Csvg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg' aria-labelledby='title' aria-describedby='desc' role='img' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3ELightning Bolt%3C/title%3E%3Cdesc%3EA color styled icon from Orion Icon Library.%3C/desc%3E%3Cpath d='M23.688 5.469h21.999l-11.084 20h13.084L22.094 58.531l6.053-23.062H16.313l7.375-30z' fill='%23fce349' data-name='layer2'%3E%3C/path%3E%3Cpath d='M34.603 25.469l11.084-20h-7.003l-11.083 20h7.002zm6.081 0L25.687 44.844l-3.593 13.687 25.593-33.062h-7.003z' opacity='.25' fill='%23fff' data-name='layer1'%3E%3C/path%3E%3Cpath d='M23.688 5.469h21.999l-11.084 20h13.084L22.094 58.531l6.053-23.062H16.313l7.375-30z' stroke-width='2' stroke-linejoin='round' stroke-linecap='round' stroke='%232e4369' fill='none' data-name='stroke'%3E%3C/path%3E%3C/svg%3E" alt="Lightning Bolt" />          <span class="self-center text-lg font-semibold whitespace-nowrap dark:text-white">Raad.co</span>
    //   </a>
    //   <div class='md:hidden flex items-center'>
    //     <button class="mobile-menu-button" onClick={() => setIsOpen(!isOpen)} type="button" aria-controls="mobile-menu-2" aria-expanded="false">
    //       <span class="sr-only">Open main menu</span>
    //       <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>
    //       <svg class="hidden w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
    //     </button>
    //   </div>
    //   <div class="hidden w-full md:block md:w-auto" id="mobile-menu">
    //     <ul class="flex flex-col mt-4 md:flex-row md:space-x-8 md:mt-0 md:text-sm md:font-medium">
    //       <li>
    //         <a href="/" class="block py-2 pr-4 pl-3 text-white bg-blue-700 rounded md:bg-transparent md:text-white md:p-0 dark:text-white" aria-current="page">Home</a>
    //       </li>
    //       <li>
    //         <a href="/about" class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 md:hover:bg-transparent md:border-0 md:hover:text-white md:p-0 dark:text-gray-400 md:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">About</a>
    //       </li>
    //       <li>
    //         <a href="/projects" class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 md:hover:bg-transparent md:border-0 md:hover:text-white md:p-0 dark:text-gray-400 md:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">Projects</a>
    //       </li>
    //       <li>
    //         <a href="/life" class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 md:hover:bg-transparent md:border-0 md:hover:text-white md:p-0 dark:text-gray-400 md:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">Life</a>
    //       </li>
    //     </ul>
    //   </div>
    // </div>
    // </nav> 

    <nav> 
      <div className=' sticky mx-auto items-center shadow-md w-full top-0 left-0'>
        <div className='md:flex items-center justify-between py-4 md:px-10 px-7'>
          <div className='font-bold text-2xl cursor-default flex items-center font-[Poppins] text-white'>
            راد
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