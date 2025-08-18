// Developer API Explorer - Main JavaScript

class APIExplorer {
  constructor() {
    this.apis = []
    this.categories = []
    this.filteredApis = []
    this.init()
  }

  async init() {
    await this.loadCategories()
    await this.loadAPIs()
    this.setupEventListeners()
    this.renderCategories()
    this.renderAPIs()
  }

  async loadCategories() {
    try {
      const response = await fetch("/api/categories")
      const data = await response.json()
      if (data.success) {
        this.categories = data.categories
      }
    } catch (error) {
      console.error("Error loading categories:", error)
    }
  }

  async loadAPIs() {
    try {
      this.showLoading(true)
      const response = await fetch("/api/list")
      const data = await response.json()
      if (data.success) {
        this.apis = data.apis
        this.filteredApis = [...this.apis]
      }
    } catch (error) {
      console.error("Error loading APIs:", error)
    } finally {
      this.showLoading(false)
    }
  }

  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById("searchInput")
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.filterAPIs(e.target.value)
      })
    }

    // Category filtering
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("category-card")) {
        const category = e.target.dataset.category
        this.filterByCategory(category)
      }
    })
  }

  renderCategories() {
    const categoryGrid = document.getElementById("categoryGrid")
    if (!categoryGrid) return

    const categoryCards = this.categories
      .map((category) => {
        const count = this.apis.filter((api) => api.category === category).length
        return `
                <div class="category-card fade-in" data-category="${category}">
                    <h3>${category}</h3>
                    <p>${count} API${count !== 1 ? "s" : ""}</p>
                </div>
            `
      })
      .join("")

    categoryGrid.innerHTML = categoryCards
  }

  renderAPIs() {
    const apisGrid = document.getElementById("apisGrid")
    if (!apisGrid) return

    if (this.filteredApis.length === 0) {
      apisGrid.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1;">
                    <h3 style="color: var(--muted-foreground);">No APIs found</h3>
                    <p style="color: var(--muted-foreground);">Try adjusting your search or category filter.</p>
                </div>
            `
      return
    }

    const apiCards = this.filteredApis
      .map(
        (api) => `
            <div class="api-card fade-in" onclick="window.location.href='/api/${api.id}'">
                <h3>${api.name}</h3>
                <span class="category-tag">${api.category}</span>
                <p>${api.description}</p>
                <div class="base-url">${api.base_url}</div>
            </div>
        `,
      )
      .join("")

    apisGrid.innerHTML = apiCards
  }

  filterAPIs(searchTerm) {
    const term = searchTerm.toLowerCase()
    this.filteredApis = this.apis.filter(
      (api) =>
        api.name.toLowerCase().includes(term) ||
        api.description.toLowerCase().includes(term) ||
        api.category.toLowerCase().includes(term),
    )
    this.renderAPIs()
  }

  filterByCategory(category) {
    if (category === "all") {
      this.filteredApis = [...this.apis]
    } else {
      this.filteredApis = this.apis.filter((api) => api.category === category)
    }
    this.renderAPIs()

    // Scroll to APIs section
    document.getElementById("apis").scrollIntoView({ behavior: "smooth" })
  }

  showLoading(show) {
    const loadingIndicator = document.getElementById("loadingIndicator")
    const apisGrid = document.getElementById("apisGrid")

    if (loadingIndicator && apisGrid) {
      if (show) {
        loadingIndicator.classList.remove("hidden")
        apisGrid.style.opacity = "0.5"
      } else {
        loadingIndicator.classList.add("hidden")
        apisGrid.style.opacity = "1"
      }
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new APIExplorer()
})

// Add some retro sound effects (optional)
function playRetroSound() {
  // Create a simple beep sound using Web Audio API
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.value = 800
  oscillator.type = "square"

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.1)
}

// Add click sound to buttons
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn") || e.target.classList.contains("category-card")) {
    try {
      playRetroSound()
    } catch (error) {
      // Ignore audio errors
    }
  }
})
