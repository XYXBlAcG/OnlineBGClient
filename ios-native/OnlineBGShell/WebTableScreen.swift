import SwiftUI
import WebKit

struct ShellWebScreen: View {
    let title: String
    let url: URL
    var leavesRoom = false
    @Environment(\.dismiss) private var dismiss
    @Environment(\.verticalSizeClass) private var verticalSizeClass
    @StateObject private var bridge = ShellWebHandle()
    @State private var loading = true
    @State private var error: String?
    @State private var alert: ShellAlert?
    @State private var closeRequested = false

    private var landscape: Bool {
        verticalSizeClass == .compact
    }

    var body: some View {
        ZStack {
            WebTableView(
                url: url,
                bridge: bridge,
                alert: $alert,
                closeRequested: $closeRequested,
                loading: $loading,
                error: $error
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .ignoresSafeArea(edges: landscape ? .all : Edge.Set())
            if loading {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                        .tint(ShellTheme.accent)
                    Text("加载中")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(ShellTheme.muted)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(ShellTheme.canvas)
                .ignoresSafeArea(edges: landscape ? .all : Edge.Set())
            }
            if let error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(ShellTheme.text)
                    .padding(10)
                    .background(ShellTheme.surface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .padding(20)
            }
        }
        .background(ShellTheme.canvas)
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(ShellTheme.surface, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbar(landscape ? .hidden : .visible, for: .navigationBar)
        .toolbar {
            if !landscape {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        close()
                    } label: {
                        Image(systemName: "chevron.left")
                    }
                    .accessibilityLabel("返回")
                }
            }
        }
        .overlay(alignment: .top) {
            if landscape {
                HStack {
                    floatingButton("chevron.left", label: "返回") { close() }
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.top, 8)
            }
        }
        .alert(
            alert?.title ?? "提示",
            isPresented: Binding(
                get: { alert != nil },
                set: { if !$0 { finishAlert(nil) } }
            )
        ) {
            if alert?.kind == .confirm {
                Button("取消", role: .cancel) {
                    finishAlert(false)
                }
                Button(alert?.confirmLabel ?? "确认") {
                    finishAlert(true)
                }
            } else {
                Button("好", role: .cancel) {}
            }
        } message: {
            Text(alert?.message ?? "")
        }
        .onChange(of: closeRequested) {
            if closeRequested {
                dismiss()
            }
        }
    }

    private func finishAlert(_ confirmed: Bool?) {
        guard let current = alert else { return }
        alert = nil
        guard current.kind == .confirm else { return }
        let value = confirmed ?? false
        bridge.dispatch(
            "window.dispatchEvent(new CustomEvent('onlinebg-native-confirm',{detail:{id:\"\(current.id)\",confirmed:\(value)}}))"
        )
    }

    private func close() {
        if leavesRoom {
            bridge.dispatch(
                "window.dispatchEvent(new Event('onlinebg-native-leave'))"
            )
        } else {
            dismiss()
        }
    }

    private func floatingButton(
        _ symbol: String,
        label: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(ShellTheme.text)
                .frame(width: 44, height: 44)
                .background(
                    ShellTheme.surface.opacity(0.94),
                    in: Circle()
                )
                .shadow(color: .black.opacity(0.16), radius: 8, y: 3)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}

private struct ShellAlert: Identifiable {
    enum Kind {
        case notice
        case confirm
    }

    let id: String
    let kind: Kind
    let title: String
    let message: String
    let confirmLabel: String
}

@MainActor
final class ShellWebHandle: ObservableObject {
    weak var webView: WKWebView?

    func dispatch(_ script: String) {
        webView?.evaluateJavaScript(script)
    }
}

struct WebTableScreen: View {
    let game: ShellGame
    let setup: ShellTableSetup
    @AppStorage("shell.enhancedGameMotion")
    private var enhancedGameMotion = true

    var body: some View {
        ShellWebScreen(
            title: game.name,
            url: tableURL
        )
    }

    private var tableURL: URL {
        var components = URLComponents(
            url: ShellWebBase.url,
            resolvingAgainstBaseURL: false
        )!
        components.queryItems = [
            URLQueryItem(name: "native-table", value: game.id),
            URLQueryItem(name: "humans", value: "\(setup.humans)"),
            URLQueryItem(name: "ai", value: "\(setup.ai)"),
            URLQueryItem(name: "difficulty", value: setup.difficulty),
            URLQueryItem(name: "aiDelayMs", value: "\(setup.aiDelayMs)"),
            URLQueryItem(
                name: "expeditionDifficulty",
                value: setup.expeditionDifficulty
            ),
            URLQueryItem(
                name: "motion",
                value: enhancedGameMotion ? "enhanced" : "basic"
            ),
        ]
        return components.url!
    }
}

struct WebRoomScreen: View {
    let invitation: ShellInvitation

    var body: some View {
        ShellWebScreen(
            title: "房间",
            url: invitation.url,
            leavesRoom: true
        )
    }
}

struct ShellRunsScreen: View {
    @AppStorage("shell.enhancedGameMotion")
    private var enhancedGameMotion = true

    var body: some View {
        ShellWebScreen(
            title: "继续远征",
            url: runsURL,
            leavesRoom: true
        )
    }

    private var runsURL: URL {
        var components = URLComponents(
            url: ShellWebBase.url,
            resolvingAgainstBaseURL: false
        )!
        components.queryItems = [
            URLQueryItem(name: "native-runs", value: "1"),
            URLQueryItem(
                name: "motion",
                value: enhancedGameMotion ? "enhanced" : "basic"
            ),
        ]
        return components.url!
    }
}

private struct WebTableView: UIViewRepresentable {
    let url: URL
    let bridge: ShellWebHandle
    @Binding var alert: ShellAlert?
    @Binding var closeRequested: Bool
    @Binding var loading: Bool
    @Binding var error: String?

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(
            context.coordinator,
            name: "nativeShell"
        )
        configuration.userContentController.addUserScript(
            WKUserScript(
                source: "window.__onlinebgNativeConfirm = true;",
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.isInspectable = true
        bridge.webView = webView
        context.coordinator.loadedURL = url
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.parent = self
        bridge.webView = webView
        if context.coordinator.loadedURL != url {
            context.coordinator.loadedURL = url
            webView.load(URLRequest(url: url))
        }
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(
            forName: "nativeShell"
        )
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: WebTableView
        var loadedURL: URL?
        private var loadingFallback: DispatchWorkItem?

        init(_ parent: WebTableView) {
            self.parent = parent
        }

        deinit {
            loadingFallback?.cancel()
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            loadingFallback?.cancel()
            let fallback = DispatchWorkItem {
                DispatchQueue.main.async {
                    self.parent.loading = false
                }
            }
            loadingFallback = fallback
            DispatchQueue.main.asyncAfter(
                deadline: .now() + 15,
                execute: fallback
            )
        }

        func webView(
            _ webView: WKWebView,
            didFail navigation: WKNavigation!,
            withError error: Error
        ) {
            DispatchQueue.main.async {
                self.parent.loading = false
                self.parent.error = error.localizedDescription
            }
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            DispatchQueue.main.async {
                self.parent.loading = false
                self.parent.error = error.localizedDescription
            }
        }

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard
                let payload = message.body as? [String: Any],
                let type = payload["type"] as? String
            else { return }
            if type == "notice" {
                let message = payload["message"] as? String ?? ""
                DispatchQueue.main.async {
                    self.parent.alert = ShellAlert(
                        id: UUID().uuidString,
                        kind: .notice,
                        title: "提示",
                        message: message,
                        confirmLabel: ""
                    )
                }
                return
            }
            if type == "confirm" {
                let id = payload["id"] as? String ?? UUID().uuidString
                let message = payload["message"] as? String ?? ""
                let label = payload["label"] as? String ?? "确认"
                DispatchQueue.main.async {
                    self.parent.alert = ShellAlert(
                        id: id,
                        kind: .confirm,
                        title: "确认",
                        message: message,
                        confirmLabel: label
                    )
                }
                return
            }
            if type == "closed" {
                DispatchQueue.main.async {
                    self.parent.closeRequested = true
                }
                return
            }
            if type == "ready" {
                loadingFallback?.cancel()
                DispatchQueue.main.async {
                    self.parent.loading = false
                }
            }
        }
    }
}
