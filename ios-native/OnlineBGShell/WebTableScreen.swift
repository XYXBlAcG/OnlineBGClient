import SwiftUI
import WebKit

struct WebTableScreen: View {
    let game: ShellGame
    @AppStorage("shell.enhancedGameMotion")
    private var enhancedGameMotion = true
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        ZStack {
            WebTableView(url: tableURL, loading: $loading, error: $error)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            if loading {
                ProgressView()
                    .controlSize(.large)
                    .tint(.white)
            }
            if let error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.white)
                    .padding(10)
                    .background(.black.opacity(0.6), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .padding(20)
            }
        }
        .background(ShellTheme.canvas)
        .navigationTitle(game.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(ShellTheme.surface, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
    }

    private var tableURL: URL {
        let base =
            ProcessInfo.processInfo.environment["SHELL_BASE_URL"] ??
            Bundle.main.object(forInfoDictionaryKey: "ShellBaseURL") as? String ??
            "http://127.0.0.1:1420"
        var components =
            URLComponents(string: base) ??
            URLComponents(string: "http://127.0.0.1:1420")!
        components.queryItems = [
            URLQueryItem(name: "native-table", value: game.id),
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
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.isInspectable = true
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.parent = self
        if webView.url != url {
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

        init(_ parent: WebTableView) {
            self.parent = parent
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.loading = false
            }
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
            if type == "ready" {
                DispatchQueue.main.async {
                    self.parent.loading = false
                }
            }
        }
    }
}
