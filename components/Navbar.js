import styled from 'styled-components'; 
import Link from 'next/link'

const Nav = styled.nav`
    height: 60px;
    background: #000; 
    color: #fff;
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
`;

const Navbar = () => {
    return (
        <Nav>
           <div> 
             <Link href="/">
                 <a>Home</a>
             </Link>
             <Link href="/">
                 <a>Is</a>
             </Link>
             <Link href="/">
                 <a>Where</a>
             </Link>
             <Link href="/you">
                 <a>You</a>
             </Link>
             <Link href="/">
                 <a>Are</a>
             </Link>
           </div>
        </Nav>
    )
}

export default Navbar
