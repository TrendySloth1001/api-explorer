// API Details Page JavaScript

class APIDetailsPage {
  constructor() {
    this.apiId = this.getAPIIdFromURL()
    this.apiData = null
    this.init()
  }

  getAPIIdFromURL() {
    const path = window.location.pathname
    const matches = path.match(/\/api\/(\d+)/)
    return matches ? Number.parseInt(matches[1]) : null
  }

  async init() {
    if (!this.apiId) {
      this.showError("Invalid API ID")
      return
    }

    await this.loadAPIDetails()
    this.setupEventListeners()
    this.renderAPIHeader()
    this.renderDocumentation()
    this.setupSandbox()
  }

  async loadAPIDetails() {
    try {
      const response = await fetch(`/api/details/${this.apiId}`)
      const data = await response.json()

      if (data.success) {
        this.apiData = data.api
        document.title = `${this.apiData.name} - Developer API Explorer`
      } else {
        this.showError(data.error || "Failed to load API details")
      }
    } catch (error) {
      console.error("Error loading API details:", error)
      this.showError("Failed to load API details")
    }
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchTab(e.target.dataset.tab)
        this.playRetroSound()
      })
    })

    // API testing
    const testBtn = document.getElementById("testApiBtn")
    if (testBtn) {
      testBtn.addEventListener("click", () => {
        this.testAPI()
        this.playRetroSound()
      })
    }

    // Code generation
    const generateBtn = document.getElementById("generateCodeBtn")
    if (generateBtn) {
      generateBtn.addEventListener("click", () => {
        this.generateCode()
        this.playRetroSound()
      })
    }
  }

  switchTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active")
    })
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active")
    })

    // Add active class to selected tab and content
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active")
    document.getElementById(tabName).classList.add("active")
  }

  renderAPIHeader() {
    if (!this.apiData) return

    const apiHeader = document.getElementById("apiHeader")
    apiHeader.innerHTML = `
            <h1 class="api-title">${this.apiData.name}</h1>
            <span class="api-category">${this.apiData.category}</span>
            <p class="api-description">${this.apiData.description}</p>
            <div class="api-base-url">
                <strong>Base URL:</strong> ${this.apiData.base_url}
            </div>
        `
  }

  renderDocumentation() {
    if (!this.apiData) return

    const docsContent = document.getElementById("apiDocs")
    docsContent.innerHTML = `
            <h4>API Information</h4>
            <p><strong>Name:</strong> ${this.apiData.name}</p>
            <p><strong>Category:</strong> ${this.apiData.category}</p>
            <p><strong>Base URL:</strong> <code>${this.apiData.base_url}</code></p>
            <p><strong>Authentication:</strong> ${this.apiData.auth_type === "none" ? "No authentication required" : this.apiData.auth_type}</p>
            
            <h4>Sample Endpoint</h4>
            <p>Try this sample endpoint to get started:</p>
            <div class="terminal">
                <div class="terminal-header">
                    <div class="terminal-dots">
                        <div class="terminal-dot red"></div>
                        <div class="terminal-dot yellow"></div>
                        <div class="terminal-dot green"></div>
                    </div>
                    <span>Sample Request</span>
                </div>
                <pre>GET ${this.apiData.base_url}${this.apiData.sample_endpoint}</pre>
            </div>
            
            <h4>Description</h4>
            <p>${this.apiData.description}</p>
            
            <h4>Getting Started</h4>
            <ul>
                <li>Use the <strong>Live Sandbox</strong> tab to test API endpoints interactively</li>
                <li>Generate code examples using the <strong>AI Code Examples</strong> tab</li>
                <li>Copy the base URL and sample endpoint to start making requests</li>
                <li>Check the API's official documentation for complete endpoint details</li>
            </ul>
        `
  }

  setupSandbox() {
    if (!this.apiData) return

    // Pre-fill the sandbox with sample data
    const endpointUrl = document.getElementById("endpointUrl")
    if (endpointUrl) {
      endpointUrl.value = `${this.apiData.base_url}${this.apiData.sample_endpoint}`
    }

    // Set default headers for common APIs
    const headersTextarea = document.getElementById("headers")
    if (headersTextarea) {
      headersTextarea.value = JSON.stringify(
        {
          Accept: "application/json",
          "User-Agent": "Developer-API-Explorer/1.0",
        },
        null,
        2,
      )
    }
  }

  async testAPI() {
    const testBtn = document.getElementById("testApiBtn")
    const responseDiv = document.getElementById("apiResponse")
    const responseContent = document.getElementById("responseContent")

    // Get form data
    const method = document.getElementById("httpMethod").value
    const url = document.getElementById("endpointUrl").value.trim()
    const paramsText = document.getElementById("queryParams").value.trim()
    const headersText = document.getElementById("headers").value.trim()
    const bodyText = document.getElementById("requestBody").value.trim()

    if (!url) {
      alert("Please enter an endpoint URL")
      return
    }

    // Parse JSON inputs
    let params = {}
    let headers = {}
    let body = {}

    try {
      if (paramsText) params = JSON.parse(paramsText)
      if (headersText) headers = JSON.parse(headersText)
      if (bodyText) body = JSON.parse(bodyText)
    } catch (error) {
      alert("Invalid JSON format in parameters, headers, or body")
      return
    }

    // Show loading state
    testBtn.innerHTML = '<div class="loading"></div> Testing...'
    testBtn.disabled = true
    responseDiv.style.display = "block"
    responseContent.textContent = "Making request..."

    try {
      const response = await fetch("/api/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          method: method,
          params: params,
          headers: headers,
          body: body,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const formattedResponse = {
          status: result.status_code,
          url: result.url,
          method: result.method,
          headers: result.headers,
          data: result.data,
        }

        responseContent.textContent = JSON.stringify(formattedResponse, null, 2)
        responseContent.style.color = result.status_code < 400 ? "var(--terminal-green)" : "var(--neon-pink)"
      } else {
        responseContent.textContent = `Error: ${result.error}`
        responseContent.style.color = "var(--neon-pink)"
      }
    } catch (error) {
      responseContent.textContent = `Network Error: ${error.message}`
      responseContent.style.color = "var(--neon-pink)"
    } finally {
      testBtn.innerHTML = "🚀 Test API"
      testBtn.disabled = false
    }
  }

  async generateCode() {
    if (!this.apiData) return

    const generateBtn = document.getElementById("generateCodeBtn")
    const codeExamples = document.getElementById("codeExamples")
    const pythonCode = document.getElementById("pythonCode")
    const javascriptCode = document.getElementById("javascriptCode")

    // Get current sandbox values
    const method = document.getElementById("httpMethod").value
    const url = document.getElementById("endpointUrl").value.trim()
    const paramsText = document.getElementById("queryParams").value.trim()
    const headersText = document.getElementById("headers").value.trim()

    let params = {}
    let headers = {}

    try {
      if (paramsText) params = JSON.parse(paramsText)
      if (headersText) headers = JSON.parse(headersText)
    } catch (error) {
      alert("Invalid JSON format in parameters or headers")
      return
    }

    // Show loading state
    generateBtn.innerHTML = '<div class="loading"></div> Generating...'
    generateBtn.disabled = true
    codeExamples.style.display = "block"
    pythonCode.textContent = "Generating Python code..."
    javascriptCode.textContent = "Generating JavaScript code..."

    try {
      const response = await fetch("/api/codegen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_name: this.apiData.name,
          endpoint: url,
          method: method,
          params: params,
          headers: headers,
        }),
      })

      const result = await response.json()

      if (result.success && result.code) {
        pythonCode.textContent = result.code.python_code || "No Python code generated"
        javascriptCode.textContent = result.code.javascript_code || "No JavaScript code generated"
      } else {
        pythonCode.textContent = `Error: ${result.error || "Failed to generate code"}`
        javascriptCode.textContent = `Error: ${result.error || "Failed to generate code"}`
      }
    } catch (error) {
      pythonCode.textContent = `Network Error: ${error.message}`
      javascriptCode.textContent = `Network Error: ${error.message}`
    } finally {
      generateBtn.innerHTML = "🤖 Generate Code Examples"
      generateBtn.disabled = false
    }
  }

  showError(message) {
    const apiHeader = document.getElementById("apiHeader")
    apiHeader.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h2 style="color: var(--neon-pink);">Error</h2>
                <p style="color: var(--muted-foreground);">${message}</p>
                <a href="/" class="btn btn-primary" style="margin-top: 20px;">← Back to Home</a>
            </div>
        `
  }

  playRetroSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 1000
      oscillator.type = "square"

      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.05)
    } catch (error) {
      // Ignore audio errors
    }
  }
}

// Initialize the API details page when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new APIDetailsPage()
})
