  export default function CV() {
    return (
      <button onClick={() => window.open("/api/cv", "_blank")} className="text-white bg-gray-700 hover:bg-sky-700 hover:text-blue px-3 py-2 rounded-md text-sm font-medium">
        <a>
          Checkout my CV
        </a>
      </button>
    );
  }
