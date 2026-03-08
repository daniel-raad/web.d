import AuthButton from "./AuthButton"

export default function Layout({ children }){
    return (
        <div>
            <div style={{ position: "fixed", top: 16, right: 24, zIndex: 900 }}>
                <AuthButton />
            </div>
            {children}
        </div>
    );
}
