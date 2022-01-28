import Image from 'next/image'

function Avatar() {
  return (
    <div className="image-div" style={{display: 'flex',  justifyContent:'center', alignItems:'center', height: '100vh'}}>
      <Image src="/you.JPG" alt="me" width="400" height="650" />
    </div>
  )
}

export default Avatar