import styled from "styled-components";
import Link from "next/link";
import React, { useState } from "react";
import Bars from "./BurgerFont";


export default function Navbar() {
  const Nav = styled.nav`
    height: 60px;
    background: #000;
    color: #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;

  const StyledLink = styled.a`
    padding: 0rem 2rem;
  `;

  const [click, setClick] = useState(false);
  const handleClick = () => setClick(!click);
  const closeMobileMenu = () => setClick(false);

  return (
    <Nav>
      <div className="navbar-container">
        <Link href="/" passHref>
          <StyledLink className="home-icon" onClick={closeMobileMenu}>Home</StyledLink>
        </Link>
      </div>
      <div className="menu-icon" onClick={handleClick}>
        <Bars />
      </div>
      <ul className={click ? "nav-menu active" : "nav-menu"}>
        <li className="nav-item">
          <Link href="/about" passHref>
            <StyledLink className="nav-links" onClick={closeMobileMenu}>About</StyledLink>
          </Link>
        </li>
        <li className="nav-item">
          <Link href="/projects" passHref >
            <StyledLink className="nav-links" onClick={closeMobileMenu}>Projects</StyledLink>
          </Link>
        </li>
        {/* <li className="nav-item">
          <Link href="/life" passHref>
            <StyledLink className="nav-links" onClick={closeMobileMenu}>Life</StyledLink>
          </Link>
        </li> */}
      </ul>
    </Nav>
  );
}
