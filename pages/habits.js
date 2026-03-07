export default function Habits() {
  return null
}

export function getServerSideProps() {
  return {
    redirect: { destination: "/dashboard?tab=habits", permanent: true },
  }
}
