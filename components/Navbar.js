import styled from "styled-components";
import Link from "next/link";
import React, { useState } from "react";
import Bars from "./BurgerFont";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    
    <div class="container sticky flex flex-wrap justify-between items-center mx-auto">
      <a href="#" class="flex">
      <img src="data:image/svg+xml;charset=utf8,%3Csvg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg' aria-labelledby='title' aria-describedby='desc' role='img' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3ELightning Bolt%3C/title%3E%3Cdesc%3EA color styled icon from Orion Icon Library.%3C/desc%3E%3Cpath d='M23.688 5.469h21.999l-11.084 20h13.084L22.094 58.531l6.053-23.062H16.313l7.375-30z' fill='%23fce349' data-name='layer2'%3E%3C/path%3E%3Cpath d='M34.603 25.469l11.084-20h-7.003l-11.083 20h7.002zm6.081 0L25.687 44.844l-3.593 13.687 25.593-33.062h-7.003z' opacity='.25' fill='%23fff' data-name='layer1'%3E%3C/path%3E%3Cpath d='M23.688 5.469h21.999l-11.084 20h13.084L22.094 58.531l6.053-23.062H16.313l7.375-30z' stroke-width='2' stroke-linejoin='round' stroke-linecap='round' stroke='%232e4369' fill='none' data-name='stroke'%3E%3C/path%3E%3C/svg%3E" alt="Lightning Bolt" />          <span class="self-center text-lg font-semibold whitespace-nowrap dark:text-white">Raad.co</span>
      </a>
      <button data-collapse-toggle="mobile-menu" onClick={() => setIsOpen(!isOpen)} type="button" class="inline-flex items-center p-2 ml-3 text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600" aria-controls="mobile-menu-2" aria-expanded="false">
        <span class="sr-only">Open main menu</span>
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>
        <svg class="hidden w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
      </button>
      <div class="hidden w-full md:block md:w-auto" id="mobile-menu">
        <ul class="flex flex-col mt-4 md:flex-row md:space-x-8 md:mt-0 md:text-sm md:font-medium">
          <li>
            <a href="/" class="block py-2 pr-4 pl-3 text-white bg-blue-700 rounded md:bg-transparent md:text-white md:p-0 dark:text-white" aria-current="page">Home</a>
          </li>
          <li>
            <a href="/about" class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 md:hover:bg-transparent md:border-0 md:hover:text-white md:p-0 dark:text-gray-400 md:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">About</a>
          </li>
          <li>
            <a href="/projects" class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 md:hover:bg-transparent md:border-0 md:hover:text-white md:p-0 dark:text-gray-400 md:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">Projects</a>
          </li>
          <li>
            <a href="/life" class="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 md:hover:bg-transparent md:border-0 md:hover:text-white md:p-0 dark:text-gray-400 md:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">Life</a>
          </li>
        </ul>
      </div>
    </div>
  

  );
}