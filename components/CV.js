import axios from 'axios';
import download from 'downloadjs';
import { ref } from 'firebase/storage';

  let api_key = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  // let fileId = '1jFLoHrB5PlmUtB5iE5JSryHiojMdGoU2oxpqORSL1F8'
  let fileId = '1GCafwrJ3yx5lKcNySPHfUQioyYHf1h-jkFNk9KaRYws'
  let url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?key=${api_key}&?mimetype=application/pdf`

  async function retrieveCV() {
    console.log("Trying to retrieve CV");
  
    axios.get(url, { responseType: 'blob', params: { 'mimeType': 'application/pdf' } })
      .then(res => {
        const fileURL = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        window.open(fileURL, '_blank');
      })
      //     .then(res => {
      //       download(res.data, 'DanielRaadCV.pdf', 'application/pdf')
      //     })
      .catch(error => console.debug('Error getting file', error));
  }
  
  export default function CV() {
    return (
      <button onClick={() => retrieveCV()} className="text-white bg-gray-700 hover:bg-sky-700 hover:text-blue px-3 py-2 rounded-md text-sm font-medium">
        <a>
          Checkout my CV
        </a>
      </button>
    );
  }