import { format } from "timeago.js";

export const estimatedFuture = (estimation: Date) => {
  const timeDiff = estimation.getTime() - Date.now();
  if (timeDiff < 60 * 1000) {
    return "Imminent";
  }
  if (timeDiff > 24 * 60 * 60 * 1000) {
    return estimation.toLocaleDateString();
  }
  return format(estimation);
};
