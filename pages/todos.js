export default function Todos() {
  return null
}

export function getServerSideProps() {
  return {
    redirect: { destination: "/dashboard?tab=todos", permanent: true },
  }
}
