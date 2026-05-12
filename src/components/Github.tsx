import { ReactSVG } from "react-svg"
import logo from './github.svg';

export function GithubLink({ repo }: { repo: string }) {
  return (
    <a
      href={repo}
      target="_blank"
      rel="noopener noreferrer"
      className="group fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-background shadow-lg transition-all hover:scale-105 hover:shadow-xl"
      aria-label="View source on GitHub"
    >
      <ReactSVG
        src={logo}
        beforeInjection={(svg) => {
          svg.setAttribute("width", String(24))
          svg.setAttribute("height", String(24))
        }}
      />
    </a>
  )
}
