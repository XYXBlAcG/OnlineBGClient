import Foundation

@main
struct NativeShellLifecycleTests {
    static func main() async throws {
        var state = ShellWebState()
        precondition(!state.requiresRoomLeave)
        state.ready(room: "")
        precondition(!state.requiresRoomLeave)
        state.ready(room: "room-1")
        precondition(state.requiresRoomLeave)
        state.fail("无法连接服务器")
        precondition(!state.requiresRoomLeave)
        state.begin()
        precondition(state.phase == .loading)
        precondition(!state.requiresRoomLeave)

        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let missing = LocalWebServer(rootURL: root, port: 0)
        do {
            _ = try await missing.start()
            preconditionFailure("Missing resources must fail before loading the WebView")
        } catch {}
        try Data("<html>local expedition</html>".utf8).write(to: root.appendingPathComponent("index.html"))
        let server = missing
        async let first = server.start()
        async let second = server.start()
        let (url, same) = try await (first, second)
        precondition(url == same)
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "native-runs", value: "1")]
        let (data, response) = try await URLSession.shared.data(from: components.url!)
        precondition((response as? HTTPURLResponse)?.statusCode == 200)
        precondition(String(data: data, encoding: .utf8) == "<html>local expedition</html>")
        let recovered = try await server.restart()
        let (again, _) = try await URLSession.shared.data(from: recovered)
        precondition(again == data)
        await server.stop()
        let fixed = LocalWebServer(rootURL: root, port: UInt16(recovered.port!))
        let fixedURL = try await fixed.start()
        let fixedRestored = try await fixed.restart()
        precondition(fixedURL == fixedRestored)
        let (fixedData, _) = try await URLSession.shared.data(from: fixedRestored)
        precondition(fixedData == data)
        await fixed.stop()
        print("Native shell lifecycle and real local HTTP passed")
    }
}
