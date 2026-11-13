import Foundation
import Network

final class LocalWebServer {
    static let shared = LocalWebServer()

    let port: UInt16 = 17878
    private let queue = DispatchQueue(
        label: "onlinebg.local-web",
        qos: .userInitiated,
        attributes: .concurrent
    )
    private var listener: NWListener?

    var baseURL: URL {
        URL(string: "http://127.0.0.1:\(port)")!
    }

    var hasBundledWeb: Bool {
        FileManager.default.fileExists(
            atPath: rootURL.appendingPathComponent("index.html").path
        )
    }

    private var rootURL: URL {
        Bundle.main.resourceURL!.appendingPathComponent("web", isDirectory: true)
    }

    func start() {
        guard listener == nil, hasBundledWeb else { return }
        guard let port = NWEndpoint.Port(rawValue: port) else { return }
        let parameters = NWParameters.tcp
        parameters.allowLocalEndpointReuse = true
        parameters.requiredLocalEndpoint = .hostPort(
            host: "127.0.0.1",
            port: port
        )
        guard let listener = try? NWListener(using: parameters) else { return }
        let ready = DispatchSemaphore(value: 0)
        listener.stateUpdateHandler = { state in
            switch state {
            case .ready, .failed, .cancelled:
                ready.signal()
            default:
                break
            }
        }
        listener.newConnectionHandler = { [weak self] connection in
            self?.handle(connection)
        }
        self.listener = listener
        listener.start(queue: queue)
        _ = ready.wait(timeout: .now() + 1)
    }

    private func handle(_ connection: NWConnection) {
        connection.start(queue: queue)
        receive(connection, buffer: Data())
    }

    private func receive(_ connection: NWConnection, buffer: Data) {
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

    private func respond(_ connection: NWConnection, request: Data) {
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

    private func respond(
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

    private func mimeType(_ ext: String) -> String {
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
