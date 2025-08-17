"use client"
import { useCallback, useMemo, useRef, useState, useEffect } from "react"
import { CLIENT_ID, AUTH_BASE_URL, base64UrlEncode, randomBytes, sha256Base64Url } from "@/lib/pkce"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  const [authUrl, setAuthUrl] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [tenantUrl, setTenantUrl] = useState("")
  const codeInputRef = useRef<HTMLTextAreaElement>(null)
  const [status, setStatus] = useState<{ message: string; type: "success" | "error" | "loading" }>()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExchanging, setIsExchanging] = useState(false)

  const generateAuthUrl = useCallback(async () => {
    setIsGenerating(true)
    setStatus({ message: "正在生成授权URL...", type: "loading" })

    try {
      const codeVerifier = base64UrlEncode(randomBytes(32))
      const codeChallenge = await sha256Base64Url(codeVerifier)
      const state = base64UrlEncode(randomBytes(8))
      sessionStorage.setItem(
        "augment_oauth_state",
        JSON.stringify({
          code_verifier: codeVerifier,
          code_challenge: codeChallenge,
          state,
          creation_time: Date.now(),
        }),
      )

      const url = new URL(AUTH_BASE_URL + "/authorize")
      url.searchParams.set("response_type", "code")
      url.searchParams.set("code_challenge", codeChallenge)
      url.searchParams.set("client_id", CLIENT_ID)
      url.searchParams.set("state", state)
      url.searchParams.set("prompt", "login")

      setAuthUrl(url.toString())
      setStatus({ message: "授权URL已生成，请复制并在新窗口中打开", type: "success" })
    } catch (error) {
      setStatus({ message: "生成授权URL失败，请重试", type: "error" })
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const openExternalHref = useMemo(() => authUrl || "#", [authUrl])

  const exchangeToken = useCallback(async () => {
    const codeValue = codeInputRef.current?.value?.trim()
    if (!codeValue) {
      setStatus({ message: "请输入授权JSON数据", type: "error" })
      return
    }

    setIsExchanging(true)
    setStatus({ message: "正在获取访问令牌...", type: "loading" })

    try {
      const parsed = JSON.parse(codeValue)
      if (!parsed?.code || !parsed?.tenant_url) {
        throw new Error("JSON数据格式不正确，缺少 code 或 tenant_url 字段")
      }

      const saved = JSON.parse(sessionStorage.getItem("augment_oauth_state") || "null")
      if (!saved) throw new Error("未找到本地OAuth状态，请重新生成授权URL")
      if (parsed.state && parsed.state !== saved.state) throw new Error("状态验证失败，请重新授权")

      const body = {
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        code_verifier: saved.code_verifier,
        redirect_uri: "",
        code: parsed.code,
      }

      const resp = await fetch("/api/token-proxy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant_url: parsed.tenant_url, payload: body }),
      })

      if (!resp.ok) {
        const errorText = await resp.text()
        throw new Error(`请求失败 (${resp.status}): ${errorText}`)
      }

      const data = await resp.json()
      if (!data.access_token) throw new Error("服务器未返回访问令牌")

      setAccessToken(data.access_token)
      setTenantUrl(parsed.tenant_url)
      setStatus({ message: "访问令牌获取成功！", type: "success" })
    } catch (e: any) {
      let errorMessage = "获取令牌失败"
      if (e instanceof SyntaxError) {
        errorMessage = "JSON格式错误，请检查输入数据"
      } else if (e.message) {
        errorMessage = e.message
      }
      setStatus({ message: errorMessage, type: "error" })
    } finally {
      setIsExchanging(false)
    }
  }, [])

  const copy = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        throw new Error("clipboard_unavailable")
      }
      setStatus({ message: `${label}已复制到剪贴板`, type: "success" })
    } catch {
      try {
        const ta = document.createElement("textarea")
        ta.value = text
        ta.style.position = "fixed"
        ta.style.top = "-9999px"
        ta.style.opacity = "0"
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        const ok = document.execCommand("copy")
        document.body.removeChild(ta)
        if (ok) setStatus({ message: `${label}已复制到剪贴板`, type: "success" })
        else throw new Error("execCommand_failed")
      } catch {
        setStatus({ message: "复制失败，请手动选择复制", type: "error" })
      }
    }
  }

  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(undefined), 4000)
    return () => clearTimeout(timer)
  }, [status])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 transition-colors duration-500 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb,0,0,0),0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb,0,0,0),0.03)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(rgba(var(--accent-rgb,0,0,0),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--accent-rgb,0,0,0),0.02)_1px,transparent_1px)] bg-[size:100px_100px] animate-pulse"
          style={{ animationDuration: "6s", animationDelay: "2s" }}
        />
      </div>

      {/* Floating geometric shapes */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Large floating circles */}
        <div
          className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-xl animate-float"
          style={{ animationDelay: "0s", animationDuration: "6s" }}
        />
        <div
          className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-accent/15 to-primary/5 rounded-full blur-lg animate-float"
          style={{ animationDelay: "2s", animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-br from-primary/5 to-accent/15 rounded-full blur-2xl animate-float"
          style={{ animationDelay: "4s", animationDuration: "10s" }}
        />
        <div
          className="absolute top-1/2 right-1/5 w-28 h-28 bg-gradient-to-br from-accent/8 to-primary/12 rounded-full blur-lg animate-float"
          style={{ animationDelay: "1s", animationDuration: "7s" }}
        />

        {/* Hexagonal and triangular shapes */}
        <div
          className="absolute top-1/3 right-10 w-16 h-16 bg-primary/10 rotate-45 animate-spin-slow blur-sm"
          style={{ animationDuration: "20s" }}
        />
        <div
          className="absolute bottom-1/4 right-1/3 w-12 h-12 bg-accent/15 rotate-12 animate-pulse"
          style={{ animationDuration: "3s" }}
        />
        <div
          className="absolute top-1/6 left-1/2 w-10 h-10 bg-primary/8 rounded-full animate-bounce"
          style={{ animationDelay: "3s", animationDuration: "4s" }}
        />
        <div
          className="absolute bottom-1/3 left-1/6 w-14 h-14 bg-accent/12 rotate-45 animate-spin-slow"
          style={{ animationDuration: "15s", animationDirection: "reverse" }}
        />

        {/* Floating dots */}
        <div
          className="absolute top-1/4 left-1/3 w-2 h-2 bg-primary/40 rounded-full animate-ping"
          style={{ animationDelay: "1s", animationDuration: "4s" }}
        />
        <div
          className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-accent/50 rounded-full animate-ping"
          style={{ animationDelay: "3s", animationDuration: "5s" }}
        />
        <div
          className="absolute top-1/2 left-1/5 w-1 h-1 bg-primary/60 rounded-full animate-ping"
          style={{ animationDelay: "2s", animationDuration: "3s" }}
        />
        <div
          className="absolute top-1/8 right-1/2 w-3 h-3 bg-accent/30 rounded-full animate-ping"
          style={{ animationDelay: "4s", animationDuration: "6s" }}
        />
        <div
          className="absolute bottom-1/6 left-2/3 w-2.5 h-2.5 bg-primary/35 rounded-full animate-ping"
          style={{ animationDelay: "0.5s", animationDuration: "4.5s" }}
        />

        {/* Gradient lines */}
        <div
          className="absolute top-0 left-1/4 w-px h-32 bg-gradient-to-b from-transparent via-primary/20 to-transparent animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute bottom-0 right-1/3 w-px h-24 bg-gradient-to-t from-transparent via-accent/20 to-transparent animate-pulse"
          style={{ animationDelay: "2s", animationDuration: "5s" }}
        />
        <div
          className="absolute top-1/3 left-0 h-px w-20 bg-gradient-to-r from-transparent via-primary/15 to-transparent animate-pulse"
          style={{ animationDelay: "1s", animationDuration: "3.5s" }}
        />
        <div
          className="absolute bottom-1/4 right-0 h-px w-16 bg-gradient-to-l from-transparent via-accent/18 to-transparent animate-pulse"
          style={{ animationDelay: "2.5s", animationDuration: "4.5s" }}
        />

        {/* Orbital elements */}
        <div
          className="absolute top-1/2 left-1/2 w-1 h-1 bg-primary/50 rounded-full animate-orbit"
          style={{ animationDuration: "12s" }}
        />
        <div
          className="absolute top-1/3 left-1/4 w-0.5 h-0.5 bg-accent/60 rounded-full animate-orbit-reverse"
          style={{ animationDuration: "8s", animationDelay: "2s" }}
        />
      </div>

      {/* Radial gradient overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(var(--primary-rgb,0,0,0),0.05)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(var(--accent-rgb,0,0,0),0.05)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(var(--background-rgb,255,255,255),0.1)_100%)]" />

      <div className="fixed top-6 right-6 z-40">
        <ThemeToggle />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 relative z-10">
        <header className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-6 group hover:scale-110 transition-all duration-200">
            <svg
              className="w-8 h-8 text-primary group-hover:rotate-12 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 animate-in fade-in slide-in-from-top-6 duration-300 delay-100">
            Augment Token 提取器
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-top-8 duration-300 delay-200">
            安全便捷地提取并复制您的 Augment API 访问令牌，仅需两步
          </p>
        </header>

        <div className="space-y-8">
          <section className="bg-card rounded-3xl border border-border p-8 shadow-lg shadow-primary/5 dark:shadow-primary/10 hover:shadow-xl hover:shadow-primary/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground rounded-full font-semibold hover:scale-110 hover:rotate-12 cursor-default">
                1
              </div>
              <h2 className="text-2xl font-semibold text-foreground">生成授权URL</h2>
            </div>

            <p className="text-muted-foreground mb-6">点击下方按钮生成授权链接，然后在新窗口中打开进行授权</p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={generateAuthUrl}
                disabled={isGenerating}
                className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-medium rounded-xl shadow-sm transition-[background-color,box-shadow,transform] duration-300 ease-out disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02]"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    生成中...
                  </>
                ) : (
                  "生成授权URL"
                )}
              </button>
            </div>

            {authUrl && (
              <div className="mt-6 p-4 bg-muted/50 rounded-2xl">
                <label className="block text-sm font-medium text-foreground mb-2">授权URL</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    aria-label="授权URL"
                    className="flex-1 px-4 py-3 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all bg-background text-foreground"
                    value={authUrl}
                    readOnly
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => copy(authUrl, "授权URL")}
                      className="px-4 py-3 border border-input hover:bg-accent rounded-xl transition-[background-color,box-shadow,transform] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center gap-2 hover:shadow-sm hover:scale-[1.02]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 00-2-2V6a2 2 0 002-2h8a2 2 0 002 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      复制
                    </button>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={openExternalHref}
                      className="px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-[background-color,box-shadow,transform] duration-300 ease-out flex items-center gap-2 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2-2V6a2 2 0 002-2h8a2 2 0 002 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      打开
                    </a>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="bg-card rounded-3xl border border-border p-8 shadow-lg shadow-primary/5 dark:shadow-primary/10 hover:shadow-xl hover:shadow-primary/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center justify-center w-10 h-10 bg-green-500 text-white rounded-full font-semibold hover:scale-110 hover:rotate-12 cursor-default">
                2
              </div>
              <h2 className="text-2xl font-semibold text-foreground">输入授权数据</h2>
            </div>

            <p className="text-muted-foreground mb-6">完成授权后，将返回的JSON数据粘贴到下方文本框中</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">授权JSON数据</label>
                <textarea
                  ref={codeInputRef}
                  rows={6}
                  placeholder='粘贴授权返回的JSON数据，例如：
{
  "code": "your_authorization_code",
  "tenant_url": "https://your-tenant.augment.com",
  "state": "your_state"
}'
                  className="w-full px-4 py-3 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none font-mono text-sm bg-background text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <button
                type="button"
                onClick={exchangeToken}
                disabled={isExchanging}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-medium rounded-xl shadow-sm transition-[background-color,box-shadow,transform] duration-300 ease-out disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-green-500/25 hover:scale-[1.02]"
              >
                {isExchanging ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    获取中...
                  </>
                ) : (
                  "获取访问令牌"
                )}
              </button>
            </div>

            {accessToken && (
              <div className="mt-8 p-6 bg-card border border-border rounded-2xl shadow-lg shadow-primary/5 dark:shadow-primary/10">
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 hover:scale-110 transition-transform duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  访问令牌生成成功
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">访问令牌</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        aria-label="访问令牌"
                        className="flex-1 px-4 py-3 border border-input rounded-xl bg-background font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        value={accessToken}
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => copy(accessToken, "访问令牌")}
                        className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-[background-color,box-shadow,transform] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 flex items-center gap-2 hover:shadow-lg hover:shadow-green-500/25 hover:scale-[1.02]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 00-2-2V6a2 2 0 002-2h8a2 2 0 002 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        复制令牌
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">租户URL</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        aria-label="租户URL"
                        className="flex-1 px-4 py-3 border border-input rounded-xl bg-background font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        value={tenantUrl}
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => copy(tenantUrl, "租户URL")}
                        className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-[background-color,box-shadow,transform] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 flex items-center gap-2 hover:shadow-lg hover:shadow-green-500/25 hover:scale-[1.02]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 00-2-2V6a2 2 0 002-2h8a2 2 0 002 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        复制租户URL
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {status && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border-0
              transform transition-all duration-300 hover:scale-[1.02] max-w-sm min-w-80
              animate-in slide-in-from-bottom-4 duration-500
              ${status.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/25" : ""}
              ${status.type === "error" ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-500/25" : ""}
              ${status.type === "loading" ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-500/25" : ""}
            `}
            >
              <div className="flex-shrink-0">
                {status.type === "loading" && (
                  <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {status.type === "success" && (
                  <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
                {status.type === "error" && (
                  <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-5 drop-shadow-sm">{status.message}</p>
              </div>

              <button
                onClick={() => setStatus(undefined)}
                className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-white/20 transition-[background-color,transform] duration-200 ease-out flex items-center justify-center group backdrop-blur-sm hover:scale-110"
              >
                <svg
                  className="w-3.5 h-3.5 text-white/80 group-hover:text-white transition-colors duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
