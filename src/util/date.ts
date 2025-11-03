import { format } from "timeago.js"

export const estimatedFuture = (estimation: Date, imminent = true) => {
  const timeDiff = estimation.getTime() - Date.now()
  if (imminent && timeDiff < 60 * 1000) {
    return "Imminent"
  }
  if (timeDiff > 24 * 60 * 60 * 1000) {
    return estimation.toLocaleDateString()
  }
  return format(estimation)
}
