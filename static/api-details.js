// API Details Page JavaScript

class APIDetailsPage {
  constructor() {
    this.apiId = this.getAPIIdFromURL()
    this.apiData = null
    this.lastResponsePayload = null
    this.metrics = { times: [], sizes: [], statuses: [], labels: [] }
    this._charts = {}
    this.init()
  }

  escapeHTML(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  normalizeCode(code) {
    if (!code) return ''
    let c = String(code)
    // Strip markdown fences if present
    if (c.startsWith('```')) {
      c = c.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```\s*$/, '')
    }
    // Decode common escaped sequences
    c = c.replace(/\r\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '    ')
    return c
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
    this.restoreFromURL()
    this.renderRecentRequests()
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
    // Keyboard shortcuts: Cmd/Ctrl+Enter to run
    document.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        this.testAPI()
      }
      if (e.key === 'Escape') {
        const responseDiv = document.getElementById('apiResponse')
        if (responseDiv) responseDiv.style.display = 'none'
      }
    })
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

    // Timeout and redirects controls
    const timeoutSlider = document.getElementById("timeoutSeconds")
    const timeoutLabel = document.getElementById("timeoutLabel")
    if (timeoutSlider && timeoutLabel) {
      timeoutSlider.addEventListener("input", () => {
        timeoutLabel.textContent = timeoutSlider.value
      })
    }

    // Copy/Export/Share/Summarize buttons
    const copyCurlBtn = document.getElementById("copyCurlBtn")
    const copyFetchBtn = document.getElementById("copyFetchBtn")
    const copyAxiosBtn = document.getElementById("copyAxiosBtn")
    const downloadHttpBtn = document.getElementById("downloadHttpBtn")
    const shareLinkBtn = document.getElementById("shareLinkBtn")
    const summarizeBtn = document.getElementById("summarizeBtn")
    const downloadResponseBtn = document.getElementById("downloadResponseBtn")
    const downloadPostmanBtn = document.getElementById("downloadPostmanBtn")

    if (copyCurlBtn) copyCurlBtn.addEventListener("click", () => this.copyToClipboard(this.buildCurlCommand()))
    if (copyFetchBtn) copyFetchBtn.addEventListener("click", () => this.copyToClipboard(this.buildFetchCode()))
    if (copyAxiosBtn) copyAxiosBtn.addEventListener("click", () => this.copyToClipboard(this.buildAxiosCode()))
    if (downloadHttpBtn) downloadHttpBtn.addEventListener("click", () => this.downloadHttpFile())
    if (shareLinkBtn) shareLinkBtn.addEventListener("click", () => this.copyShareLink())
    if (summarizeBtn) summarizeBtn.addEventListener("click", () => this.summarizeResponse())
    if (downloadResponseBtn) downloadResponseBtn.addEventListener("click", () => this.downloadResponse())
    if (downloadPostmanBtn) downloadPostmanBtn.addEventListener("click", () => this.downloadPostmanCollection())
    // VS Code-like code tabs switching
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-code-tab]')
      if (!tab) return
      document.querySelectorAll('.vscode-tab').forEach(t => t.classList.remove('active'))
      document.querySelectorAll('.vscode-panel').forEach(p => p.classList.remove('active'))
      tab.classList.add('active')
      const name = tab.getAttribute('data-code-tab')
      const panel = document.querySelector(`[data-code-panel="${name}"]`)
      if (panel) panel.classList.add('active')
    })

    // Analyzer Run Test button
    const analyzeBtn = document.getElementById('analyzeTestBtn')
    if (analyzeBtn) analyzeBtn.addEventListener('click', () => this.testAPI())
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
    const responseSummary = document.getElementById("responseSummary")

    // Get form data
    const method = document.getElementById("httpMethod").value
    const url = document.getElementById("endpointUrl").value.trim()
    const paramsText = document.getElementById("queryParams").value.trim()
    const headersText = document.getElementById("headers").value.trim()
    const bodyText = document.getElementById("requestBody").value.trim()
    const allowRedirects = document.getElementById("allowRedirects").checked
    const timeoutSeconds = Number.parseInt(document.getElementById("timeoutSeconds").value, 10)

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
    if (responseSummary) responseSummary.textContent = ""

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
          allow_redirects: allowRedirects,
          timeout_seconds: timeoutSeconds,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const formattedResponse = {
          status: result.status_code,
          url: result.url,
          method: result.method,
          time_ms: result.elapsed_ms,
          size_bytes: result.size_bytes,
          headers: result.headers,
          data: result.data,
        }

        responseContent.textContent = JSON.stringify(formattedResponse, null, 2)
        responseContent.style.color = result.status_code < 400 ? "var(--terminal-green)" : "var(--neon-pink)"
        if (window.Prism) window.Prism.highlightElement(responseContent)

        this.lastResponsePayload = result.data
        this.addRecentRequest({ method, url, params, headers, body })
        this.updateURLWithState({ method, url, params, headers, body, allowRedirects, timeoutSeconds })
        this.recordMetrics(result.elapsed_ms, result.size_bytes, result.status_code)
        this.updateAnalyzer()
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

  // Analyzer helpers
  recordMetrics(timeMs, sizeBytes, statusCode) {
    const ts = new Date().toLocaleTimeString()
    this.metrics.times.push(timeMs)
    this.metrics.sizes.push(sizeBytes)
    this.metrics.statuses.push(statusCode)
    this.metrics.labels.push(ts)
    const maxPoints = 50
    if (this.metrics.labels.length > maxPoints) {
      ['times','sizes','statuses','labels'].forEach(k => this.metrics[k].shift())
    }
  }

  updateAnalyzer() {
    const avg = (arr) => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0
    const p95 = (arr) => {
      if (!arr.length) return 0
      const s = [...arr].sort((a,b)=>a-b)
      const idx = Math.floor(0.95 * (s.length - 1))
      return s[idx]
    }
    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text }
    setText('statAvgTime', `${avg(this.metrics.times)} ms`)
    setText('statP95Time', `${p95(this.metrics.times)} ms`)
    setText('statAvgSize', `${avg(this.metrics.sizes)} B`)
    setText('statRequests', String(this.metrics.labels.length))

    this._charts = this._charts || {}
    this._charts.chartTime = this.renderLineChart('chartTime', this.metrics.labels, this.metrics.times, 'ms', '#00ff41')
    this._charts.chartSize = this.renderLineChart('chartSize', this.metrics.labels, this.metrics.sizes, 'bytes', '#fbbf24')
    this._charts.chartStatus = this.renderBarChart('chartStatus', this.metrics.labels, this.metrics.statuses, 'status', '#00d4ff')
  }

  renderLineChart(id, labels, data, suffix, color) {
    const ctx = document.getElementById(id)
    if (!ctx || !window.Chart) return null
    if (this._charts && this._charts[id]) {
      this._charts[id].data.labels = labels
      this._charts[id].data.datasets[0].data = data
      this._charts[id].update()
      return this._charts[id]
    }
    const chart = new window.Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label: id, data, borderColor: color, backgroundColor: 'rgba(0,255,65,0.1)', tension: 0.25 }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: '#9ca3af' } }, y: { ticks: { color: '#9ca3af', callback: (v) => `${v} ${suffix}` } } }
      }
    })
    this._charts[id] = chart
    return chart
  }

  renderBarChart(id, labels, data, suffix, color) {
    const ctx = document.getElementById(id)
    if (!ctx || !window.Chart) return null
    if (this._charts && this._charts[id]) {
      this._charts[id].data.labels = labels
      this._charts[id].data.datasets[0].data = data
      this._charts[id].update()
      return this._charts[id]
    }
    const chart = new window.Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: id, data, backgroundColor: 'rgba(0,212,255,0.2)', borderColor: color }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: '#9ca3af' } }, y: { ticks: { color: '#9ca3af', callback: (v) => `${v} ${suffix}` } } }
      }
    })
    this._charts[id] = chart
    return chart
  }

  async generateCode() {
    if (!this.apiData) return

    const generateBtn = document.getElementById("generateCodeBtn")
    const codeExamples = document.getElementById("codeExamples")
    const pythonCode = document.getElementById("pythonCode")
    const javascriptCode = document.getElementById("javascriptCode")
    const curlCode = document.getElementById("curlCode")
    const axiosCode = document.getElementById("axiosCode")

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
    if (curlCode) curlCode.textContent = "Generating cURL..."
    if (axiosCode) axiosCode.textContent = "Generating Axios..."

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
        pythonCode.textContent = this.normalizeCode(result.code.python_code || "No Python code generated") + "\n"
        javascriptCode.textContent = this.normalizeCode(result.code.javascript_code || "No JavaScript code generated") + "\n"
        if (curlCode) curlCode.textContent = this.normalizeCode(result.code.curl || this.buildCurlCommand()) + "\n"
        if (axiosCode) axiosCode.textContent = this.normalizeCode(result.code.axios_code || this.buildAxiosCode()) + "\n"
        if (window.Prism) {
          window.Prism.highlightElement(pythonCode)
          window.Prism.highlightElement(javascriptCode)
          if (curlCode) window.Prism.highlightElement(curlCode)
          if (axiosCode) window.Prism.highlightElement(axiosCode)
        }
      } else {
        pythonCode.textContent = `Error: ${result.error || "Failed to generate code"}`
        javascriptCode.textContent = `Error: ${result.error || "Failed to generate code"}`
        if (curlCode) curlCode.textContent = `Error: ${result.error || "Failed to generate code"}`
        if (axiosCode) axiosCode.textContent = `Error: ${result.error || "Failed to generate code"}`
      }
    } catch (error) {
      pythonCode.textContent = `Network Error: ${error.message}`
      javascriptCode.textContent = `Network Error: ${error.message}`
    } finally {
      generateBtn.innerHTML = "🤖 Generate Code Examples"
      generateBtn.disabled = false
    }
  }

  buildRequestState() {
    const method = document.getElementById("httpMethod").value
    const url = document.getElementById("endpointUrl").value.trim()
    const params = this.safeParseJSON(document.getElementById("queryParams").value.trim()) || {}
    const headers = this.safeParseJSON(document.getElementById("headers").value.trim()) || {}
    const body = this.safeParseJSON(document.getElementById("requestBody").value.trim()) || {}
    const allowRedirects = document.getElementById("allowRedirects").checked
    const timeoutSeconds = Number.parseInt(document.getElementById("timeoutSeconds").value, 10)
    return { method, url, params, headers, body, allowRedirects, timeoutSeconds }
  }

  safeParseJSON(text) {
    try { return text ? JSON.parse(text) : null } catch { return null }
  }

  buildCurlCommand() {
    const { method, url, params, headers, body } = this.buildRequestState()
    const qp = params && Object.keys(params).length ?
      "?" + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : ""
    const headerFlags = Object.entries(headers || {}).map(([k, v]) => `-H ${JSON.stringify(`${k}: ${v}`)}`).join(" ")
    const dataFlag = method !== "GET" && body && Object.keys(body).length ? `--data ${JSON.stringify(JSON.stringify(body))}` : ""
    return `curl -X ${method} ${headerFlags} ${dataFlag} ${JSON.stringify(url + qp)}`.trim()
  }

  buildFetchCode() {
    const { method, url, params, headers, body } = this.buildRequestState()
    const qp = params && Object.keys(params).length ?
      "?" + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : ""
    return `fetch(${JSON.stringify(url + qp)}, {\n  method: ${JSON.stringify(method)},\n  headers: ${JSON.stringify(headers, null, 2)},\n  ${method !== "GET" && Object.keys(body || {}).length ? `body: JSON.stringify(${JSON.stringify(body, null, 2)}),\n` : ""}}).then(r => r.json()).then(console.log).catch(console.error)`
  }

  buildAxiosCode() {
    const { method, url, params, headers, body } = this.buildRequestState()
    const config = { method: method.toLowerCase(), url, params, headers }
    if (method !== "GET" && body && Object.keys(body).length) config.data = body
    return `import axios from 'axios'\n\naxios(${JSON.stringify(config, null, 2)}).then(r => console.log(r.data)).catch(console.error)`
  }

  downloadHttpFile() {
    const { method, url, params, headers, body } = this.buildRequestState()
    const qp = params && Object.keys(params).length ?
      "?" + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : ""
    const lines = [
      `${method} ${url + qp}`,
      ...Object.entries(headers || {}).map(([k, v]) => `${k}: ${v}`),
      "",
      method !== "GET" && body && Object.keys(body).length ? JSON.stringify(body, null, 2) : "",
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "request.http"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  downloadResponse() {
    if (!this.lastResponsePayload) return
    const isJSON = typeof this.lastResponsePayload === 'object'
    const text = isJSON ? JSON.stringify(this.lastResponsePayload, null, 2) : String(this.lastResponsePayload)
    const blob = new Blob([text], { type: isJSON ? 'application/json' : 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = isJSON ? 'response.json' : 'response.txt'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  downloadPostmanCollection() {
    const state = this.buildRequestState()
    const item = {
      name: `${state.method} ${state.url}`,
      request: {
        method: state.method,
        header: Object.entries(state.headers || {}).map(([key, value]) => ({ key, value })),
        url: {
          raw: state.url,
          host: [],
          path: [],
          query: Object.entries(state.params || {}).map(([key, value]) => ({ key, value: String(value) })),
        },
        ...(state.method !== 'GET' && Object.keys(state.body || {}).length
          ? { body: { mode: 'raw', raw: JSON.stringify(state.body, null, 2) } }
          : {}),
      },
    }
    const collection = {
      info: {
        name: `API Explorer - ${this.apiData ? this.apiData.name : 'Request'}`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [item],
    }
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'api-explorer.postman_collection.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  copyShareLink() {
    const state = this.buildRequestState()
    const params = new URLSearchParams({
      m: state.method,
      u: state.url,
      p: JSON.stringify(state.params || {}),
      h: JSON.stringify(state.headers || {}),
      b: JSON.stringify(state.body || {}),
      r: String(state.allowRedirects),
      t: String(state.timeoutSeconds),
    })
    const link = `${location.origin}${location.pathname}?${params.toString()}`
    this.copyToClipboard(link)
  }

  updateURLWithState(state) {
    const params = new URLSearchParams({
      m: state.method,
      u: state.url,
      p: JSON.stringify(state.params || {}),
      h: JSON.stringify(state.headers || {}),
      b: JSON.stringify(state.body || {}),
      r: String(state.allowRedirects),
      t: String(state.timeoutSeconds),
    })
    history.replaceState(null, "", `?${params.toString()}`)
  }

  restoreFromURL() {
    const qp = new URLSearchParams(location.search)
    if (!qp.has("u")) return
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val }
    const setJSON = (id, obj) => { const el = document.getElementById(id); if (el) el.value = JSON.stringify(obj, null, 2) }
    setVal("httpMethod", qp.get("m") || "GET")
    setVal("endpointUrl", qp.get("u") || "")
    setJSON("queryParams", JSON.parse(qp.get("p") || "{}"))
    setJSON("headers", JSON.parse(qp.get("h") || "{}"))
    setJSON("requestBody", JSON.parse(qp.get("b") || "{}"))
    const allow = qp.get("r") === "true"
    const timeout = Number.parseInt(qp.get("t") || "10", 10)
    const allowEl = document.getElementById("allowRedirects")
    const timeoutEl = document.getElementById("timeoutSeconds")
    const timeoutLabel = document.getElementById("timeoutLabel")
    if (allowEl) allowEl.checked = allow
    if (timeoutEl) timeoutEl.value = timeout
    if (timeoutLabel) timeoutLabel.textContent = String(timeout)
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    })
  }

  addRecentRequest(entry) {
    try {
      const key = `recent_requests_${this.apiId}`
      const existing = JSON.parse(localStorage.getItem(key) || "[]")
      const withTime = { ...entry, ts: Date.now() }
      const next = [withTime, ...existing.filter(e => e.url !== entry.url || e.method !== entry.method)]
        .slice(0, 5)
      localStorage.setItem(key, JSON.stringify(next))
      this.renderRecentRequests()
    } catch {}
  }

  renderRecentRequests() {
    const container = document.getElementById("recentRequests")
    if (!container) return
    try {
      const key = `recent_requests_${this.apiId}`
      const items = JSON.parse(localStorage.getItem(key) || "[]")
      container.innerHTML = items.map((e, idx) => {
        const date = new Date(e.ts)
        return `<div class="terminal" style="padding:8px; cursor:pointer;" data-idx="${idx}"><pre>${e.method} ${e.url}</pre><div style="color:var(--muted-foreground); font-size:12px; padding:0 12px;">${date.toLocaleString()}</div></div>`
      }).join("") || '<div style="color:var(--muted-foreground);">No recent requests</div>'
      container.querySelectorAll('[data-idx]').forEach(div => {
        div.addEventListener('click', () => {
          const idx = Number.parseInt(div.getAttribute('data-idx'), 10)
          this.loadRecent(idx)
        })
      })
    } catch {
      container.innerHTML = ''
    }
  }

  loadRecent(idx) {
    try {
      const key = `recent_requests_${this.apiId}`
      const items = JSON.parse(localStorage.getItem(key) || "[]")
      const e = items[idx]
      if (!e) return
      document.getElementById("httpMethod").value = e.method
      document.getElementById("endpointUrl").value = e.url
      document.getElementById("queryParams").value = JSON.stringify(e.params || {}, null, 2)
      document.getElementById("headers").value = JSON.stringify(e.headers || {}, null, 2)
      document.getElementById("requestBody").value = JSON.stringify(e.body || {}, null, 2)
    } catch {}
  }

  async summarizeResponse() {
    const summaryEl = document.getElementById("responseSummary")
    if (!this.lastResponsePayload) {
      summaryEl.textContent = "Run a request first to summarize the response."
      return
    }
    summaryEl.textContent = "Summarizing..."
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: this.lastResponsePayload })
      })
      const data = await res.json()
      if (data.success) {
        const s = data.summary
        const fields = (s.key_fields || []).slice(0, 8).map(f => `<div class="summary-card"><div class="badge">${this.escapeHTML(f.name || '')}</div><div>${this.escapeHTML(f.description || '')}</div></div>`).join('')
        summaryEl.innerHTML = `
<div><strong>Overview:</strong> ${this.escapeHTML(s.overview || '')}</div>
<div style="margin-top:8px;"><span class="badge">Shape: ${this.escapeHTML(s.shape || 'unknown')}</span>${(s.warnings||[]).map(w=>`<span class=\"badge\" style=\"background: rgba(255,0,128,0.1); color: var(--neon-pink);\">${this.escapeHTML(w)}</span>`).join('')}</div>
<div class="summary-grid">${fields || ''}</div>
        `
      } else {
        summaryEl.textContent = `Error: ${data.error}`
      }
    } catch (e) {
      summaryEl.textContent = `Network Error: ${e.message}`
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
