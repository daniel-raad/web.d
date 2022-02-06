import React, { useState, useEffect } from 'react';
import Link from 'next/link';

import { getCategories } from '../services';


const BlogHeader = () => {
    const [categories, setCategories] = useState([]); 
    useEffect(() => {
        getCategories()
        .then((newCategories) => setCategories(newCategories))
    })
  return (
    <div className="container mx-auto px-10 mb-8">
        <div className="border-b w-full inline-block border-blue-400 py-8"> 
            {/* <div className='md:float-left block'>
                <Link href="/">
                    <span className="cursor-pointer font-bold text-4xl text-black">
                        Home
                    </span>
                </Link>
                <Link href="/about">
                    <span className="cursor-pointer ml-4 font-bold text-2xl text-black">
                        About
                    </span>
                </Link>
            </div> */}
            <div className="hidden md:float-left md:contents">
                {categories.map((category) => (
                    <Link key={category.slug} href={`/category/${category.slug}`}>
                        <span className="md:float-right mt-2 align-middle text-white ml-10 font-bold cursor-pointer">
                            {category.name}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    </div>

  );
};

export default BlogHeader;
