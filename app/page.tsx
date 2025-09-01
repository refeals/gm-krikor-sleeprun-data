import Home from "@/app/(components)/home"
import { getGames } from "@/fetchers/getGames"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"

export default async function Index() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ["games"],
    queryFn: () => getGames(),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Home />
    </HydrationBoundary>
  )
}
