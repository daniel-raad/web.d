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

const StyledLink = styled.a`
    padding: 0rem 2rem
`;
const Navbar = () => {
    return (
        <Nav>
           <div> 
             <Link href="/" passHref>
                 <StyledLink>Home</StyledLink>
             </Link>
            </div>
            <div> 
             <Link href="/" passHref>
                 <StyledLink>About</StyledLink>
             </Link>
             <Link href="/" passHref>
                 <StyledLink>Projects</StyledLink>
             </Link>
             <Link href="/you" passHref> 
                 <StyledLink>Life</StyledLink>
             </Link>
           </div>
        </Nav>
    )
}

export default Navbar
