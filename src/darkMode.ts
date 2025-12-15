if (localStorage.getItem("dark-mode") === "true") {
  document.body.classList.add("dark")
}

;(window as any).enableDarkMode = (enabled: boolean) => {
  localStorage.setItem("dark-mode", String(enabled))
  if (enabled) {
    document.body.classList.add("dark")
  } else {
    document.body.classList.remove("dark")
  }
}
