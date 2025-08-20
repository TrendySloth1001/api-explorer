// Developer API Explorer - Main JavaScript

class APIExplorer {
  constructor() {
    this.apis = []
    this.categories = []
    this.filteredApis = []
    this.searchTerm = ""
    this.activeCategory = "all"
    this.limit = 24
    this.offset = 0
    this.total = 0
    this.isLoadingMore = false
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
      const params = new URLSearchParams()
      params.set('limit', String(this.limit))
      params.set('offset', String(this.offset))
      if (this.activeCategory !== 'all') params.set('category', this.activeCategory)
      const response = await fetch(`/api/list?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        if (this.offset === 0) {
          this.apis = data.apis
        } else {
          this.apis = [...this.apis, ...data.apis]
        }
        this.total = data.total ?? this.apis.length
        this.filteredApis = this.applyFilters()
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
      const debounced = this.debounce((value) => {
        this.filterAPIs(value)
      }, 250)
      searchInput.addEventListener("input", (e) => debounced(e.target.value))
    }

    // Category filtering
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("category-card")) {
        const category = e.target.dataset.category
        this.filterByCategory(category)
      }
    })

    // Infinite scroll
    window.addEventListener('scroll', () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200
      if (nearBottom) this.loadMore()
    })
  }

  renderCategories() {
    const categoryGrid = document.getElementById("categoryGrid")
    if (!categoryGrid) return

    const cats = ["all", ...this.categories]
    const icons = {
      all: "🧩",
      weather: "⛅",
      finance: "💹",
      fun: "🎲",
      testing: "🧪",
    }
    const categoryCards = cats
      .map((category) => {
        const count = category === 'all' ? this.total || this.apis.length : this.apis.filter((api) => api.category === category).length
        const icon = icons[(category || '').toLowerCase()] || "🧩"
        return `
                <div class="category-card fade-in ${this.activeCategory === category ? 'active' : ''}" data-category="${category}">
                    <h3>${icon} ${category}</h3>
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
                <h3>${this.highlight(api.name)}</h3>
                <span class="category-tag">${api.category}</span>
                <p>${this.highlight(api.description)}</p>
                <div class="base-url">${api.base_url}</div>
            </div>
        `,
      )
      .join("")

    apisGrid.innerHTML = apiCards
  }

  filterAPIs(searchTerm) {
    this.searchTerm = searchTerm
    this.filteredApis = this.applyFilters()
    this.renderAPIs()
  }

  filterByCategory(category) {
    if (this.activeCategory === category) return
    this.activeCategory = category
    this.offset = 0
    this.apis = []
    this.filteredApis = []
    this.loadAPIs().then(() => {
      this.renderCategories()
      this.renderAPIs()
      document.getElementById("apis").scrollIntoView({ behavior: "smooth" })
    })
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

  loadMore() {
    if (this.isLoadingMore) return
    if (this.apis.length >= this.total) return
    if (this.searchTerm && this.searchTerm.trim() !== '') return
    this.isLoadingMore = true
    this.offset += this.limit
    this.loadAPIs().finally(() => {
      this.isLoadingMore = false
    })
  }

  applyFilters() {
    const term = (this.searchTerm || '').toLowerCase()
    const byCategory = this.activeCategory === 'all' ? this.apis : this.apis.filter(a => a.category === this.activeCategory)
    if (!term) return [...byCategory]
    return byCategory.filter(
      (api) =>
        api.name.toLowerCase().includes(term) ||
        api.description.toLowerCase().includes(term) ||
        api.category.toLowerCase().includes(term),
    )
  }

  debounce(fn, delay) {
    let t
    return (...args) => {
      clearTimeout(t)
      t = setTimeout(() => fn(...args), delay)
    }
  }

  escapeHTML(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  highlight(text) {
    const term = (this.searchTerm || '').trim()
    if (!term) return this.escapeHTML(text)
    try {
      const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig')
      return this.escapeHTML(text).replace(re, '<mark>$1</mark>')
    } catch {
      return this.escapeHTML(text)
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
