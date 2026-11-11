// Game pages render on their first visit, which can take a moment.
export default function GameLoading() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-busy="true"
      className="flex flex-col gap-6 focus-visible:outline-none md:max-w-[720px]"
    >
      <p role="status" className="sr-only">
        Carregando jogo…
      </p>
      <div aria-hidden className="flex animate-pulse flex-col gap-6 pt-3">
        <div className="h-11 w-24 rounded-control bg-surface" />
        <div className="h-44 rounded-card bg-surface" />
        <div className="flex flex-col gap-3">
          <div className="h-4 w-20 rounded-full bg-surface" />
          <div className="h-10 rounded-control bg-surface" />
          <div className="h-10 rounded-control bg-surface" />
        </div>
        <div className="h-28 rounded-control bg-surface" />
      </div>
    </main>
  )
}
