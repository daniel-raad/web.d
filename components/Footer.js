import styled from 'styled-components';


const FooterSection = styled.div`
    background:  #000;
    height: 60px;
    display:  flex;
    justify-content: center;
    align-items: center;

`
const hstyle = {color: 'white'}; 

const Footer = () => {

    return (
        <FooterSection> 
            <h2 style={hstyle}> Daniel Raad 2022 </h2>
            <p style={hstyle}> ~ Echo con amor </p>
        </FooterSection>
    );
};

export default Footer;