import axios from 'axios';
import download from 'downloadjs';

  async function retrieveCV() {
    let api_key = 'AIzaSyBvh9M-MgtK6rk81DVGYx9zsa8wDS64Lc0'
    let fileId = '1jFLoHrB5PlmUtB5iE5JSryHiojMdGoU2oxpqORSL1F8'
    let url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?key=${api_key}&?mimetype=application/pdf`
    console.log("Trying to retrieve CV")

    axios.get(url, { responseType: 'blob', params: { 'mimeType': 'application/pdf' } })
      .then(res => {
        download(res.data, 'DanielRaadCV.pdf', 'application/pdf')
      })
      .catch(error => console.debug('Error getting file'))

  }

  export default function CV(){ 
      return(
        <button onClick={() => retrieveCV()} className="text-white bg-gray-700 hover:bg-sky-700 hover:text-blue px-3 py-2 rounded-md text-sm font-medium">
                <a>
                    Checkout my CV
                </a>
        </button>
      )
  }