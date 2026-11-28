import Foundation
import Network

actor LocalWebServer {
    static let shared = LocalWebServer()

    nonisolated let port: UInt16
    private let queue = DispatchQueue(
        label: "onlinebg.local-web",
        qos: .userInitiated
    )
    private var listener: NWListener?
    private var waiting: [CheckedContinuation<URL, Error>] = []
    nonisolated private let rootURL: URL

    nonisolated var baseURL: URL {
        URL(string: "http://127.0.0.1:\(port)")!
    }

    nonisolated var hasBundledWeb: Bool {
        FileManager.default.fileExists(
            atPath: rootURL.appendingPathComponent("index.html").path
        )
    }

    init(rootURL: URL = Bundle.main.resourceURL!.appendingPathComponent("web", isDirectory: true), port: UInt16 = 17878) {
        self.rootURL = rootURL
        self.port = port
    }

    func start() async throws -> URL {
        guard hasBundledWeb else {
            throw NSError(domain: "onlinebg.local-web", code: 1, userInfo: [NSLocalizedDescriptionKey: "缺少内置牌桌资源，请重新安装完整客户端。"])
        }
        if let listener, case .ready = listener.state {
            return URL(string: "http://127.0.0.1:\(listener.port!.rawValue)")!
        }
        return try await withCheckedThrowingContinuation { continuation in
            waiting.append(continuation)
            guard listener == nil else { return }
            do {
                let parameters = NWParameters.tcp
                parameters.allowLocalEndpointReuse = true
                parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: port)!)
                let listener = try NWListener(using: parameters)
                self.listener = listener
                listener.stateUpdateHandler = { [weak self, weak listener] state in
                    guard let listener else { return }
                    Task { await self?.update(state, listener: listener) }
                }
                listener.newConnectionHandler = { [weak self] connection in
                    self?.handle(connection)
                }
                listener.start(queue: queue)
            } catch {
                finishStartup(.failure(error))
            }
        }
    }

    func restart() async throws -> URL {
        stop()
        return try await start()
    }

    func stop() {
        let previous = listener
        listener = nil
        previous?.cancel()
        finishStartup(.failure(CancellationError()))
    }

    private func update(_ state: NWListener.State, listener: NWListener) {
        guard self.listener === listener else { return }
        switch state {
        case .ready:
            finishStartup(.success(URL(string: "http://127.0.0.1:\(listener.port!.rawValue)")!))
        case .failed(let error), .waiting(let error):
            self.listener = nil
            listener.cancel()
            finishStartup(.failure(error))
        case .cancelled:
            self.listener = nil
            finishStartup(.failure(CancellationError()))
        default:
            break
        }
    }

    private func finishStartup(_ result: Result<URL, Error>) {
        let pending = waiting
        waiting.removeAll()
        for continuation in pending {
            continuation.resume(with: result)
        }
    }

    nonisolated private func handle(_ connection: NWConnection) {
        connection.start(queue: queue)
        receive(connection, buffer: Data())
    }

    nonisolated private func receive(_ connection: NWConnection, buffer: Data) {
        connection.receive(
            minimumIncompleteLength: 1,
            maximumLength: 64 * 1024
        ) { [weak self] data, _, isComplete, error in
            var buffer = buffer
            if let data {
                buffer.append(data)
            }
            if buffer.count > 128 * 1024 {
                connection.cancel()
                return
            }
            if buffer.range(of: Data("\r\n\r\n".utf8)) != nil {
                self?.respond(connection, request: buffer)
                return
            }
            if isComplete || error != nil {
                connection.cancel()
                return
            }
            self?.receive(connection, buffer: buffer)
        }
    }

    nonisolated private func respond(_ connection: NWConnection, request: Data) {
        guard
            let text = String(data: request, encoding: .utf8),
            let first = text.components(separatedBy: "\r\n").first
        else {
            connection.cancel()
            return
        }
        let parts = first.split(separator: " ")
        guard parts.count >= 2 else {
            connection.cancel()
            return
        }
        let method = String(parts[0])
        guard method == "GET" || method == "HEAD" else {
            respond(
                connection,
                status: "405 Method Not Allowed",
                contentType: "text/plain; charset=utf-8",
                body: Data("Method Not Allowed".utf8)
            )
            return
        }
        var path = String(parts[1])
        if let query = path.firstIndex(of: "?") {
            path = String(path[..<query])
        }
        path = path.removingPercentEncoding ?? path
        if path == "/" {
            path = "/index.html"
        }
        let relative = path.hasPrefix("/") ? String(path.dropFirst()) : path
        let root = rootURL.standardizedFileURL
        var target = rootURL.appendingPathComponent(relative).standardizedFileURL
        guard
            target.path == root.path ||
            target.path.hasPrefix(root.path + "/")
        else {
            respond(connection, status: "404 Not Found", contentType: "text/plain; charset=utf-8", body: Data("Not Found".utf8))
            return
        }
        var isDirectory: ObjCBool = false
        if !FileManager.default.fileExists(
            atPath: target.path,
            isDirectory: &isDirectory
        ) || isDirectory.boolValue {
            if URL(fileURLWithPath: path).pathExtension.isEmpty {
                target = rootURL.appendingPathComponent("index.html")
            } else {
                respond(connection, status: "404 Not Found", contentType: "text/plain; charset=utf-8", body: Data("Not Found".utf8))
                return
            }
        }
        guard let body = try? Data(contentsOf: target) else {
            respond(connection, status: "404 Not Found", contentType: "text/plain; charset=utf-8", body: Data("Not Found".utf8))
            return
        }
        respond(
            connection,
            status: "200 OK",
            contentType: mimeType(target.pathExtension),
            body: method == "HEAD" ? Data() : body,
            contentLength: body.count
        )
    }

    nonisolated private func respond(
        _ connection: NWConnection,
        status: String,
        contentType: String,
        body: Data,
        contentLength: Int? = nil
    ) {
        let length = contentLength ?? body.count
        let header = "HTTP/1.1 \(status)\r\nContent-Type: \(contentType)\r\nContent-Length: \(length)\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n"
        var response = Data(header.utf8)
        response.append(body)
        connection.send(
            content: response,
            completion: .contentProcessed { _ in
                connection.cancel()
            }
        )
    }

    nonisolated private func mimeType(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html":
            return "text/html; charset=utf-8"
        case "js", "mjs":
            return "text/javascript; charset=utf-8"
        case "css":
            return "text/css; charset=utf-8"
        case "json":
            return "application/json; charset=utf-8"
        case "svg":
            return "image/svg+xml"
        case "png":
            return "image/png"
        case "jpg", "jpeg":
            return "image/jpeg"
        case "webp":
            return "image/webp"
        case "woff":
            return "font/woff"
        case "woff2":
            return "font/woff2"
        case "ttf":
            return "font/ttf"
        case "wasm":
            return "application/wasm"
        case "mp3":
            return "audio/mpeg"
        case "ogg":
            return "audio/ogg"
        case "webm":
            return "video/webm"
        case "ico":
            return "image/x-icon"
        default:
            return "application/octet-stream"
        }
    }
}
