import AVFoundation
import SwiftUI

struct QRScannerView: UIViewControllerRepresentable {
    let onCode: (String) -> Void

    func makeUIViewController(context: Context) -> QRScannerController {
        let controller = QRScannerController()
        controller.onCode = onCode
        return controller
    }

    func updateUIViewController(
        _ uiViewController: QRScannerController,
        context: Context
    ) {
        uiViewController.onCode = onCode
    }
}

final class QRScannerController: UIViewController,
    AVCaptureMetadataOutputObjectsDelegate
{
    var onCode: ((String) -> Void)?
    private let session = AVCaptureSession()
    private var preview: AVCaptureVideoPreviewLayer?
    private var handled = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            configure()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.configure()
                    } else {
                        self?.showMessage("请在系统设置中允许相机权限")
                    }
                }
            }
        default:
            showMessage("请在系统设置中允许相机权限")
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        preview?.frame = view.bounds
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if session.isRunning {
            session.stopRunning()
        }
    }

    private func configure() {
        guard
            let device = AVCaptureDevice.default(for: .video),
            let input = try? AVCaptureDeviceInput(device: device),
            session.canAddInput(input)
        else {
            showMessage("无法使用相机")
            return
        }
        session.addInput(input)
        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else {
            showMessage("无法使用相机")
            return
        }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [.qr]
        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        layer.frame = view.bounds
        view.layer.addSublayer(layer)
        preview = layer
        DispatchQueue.global(qos: .userInitiated).async {
            self.session.startRunning()
        }
    }

    private func showMessage(_ text: String) {
        let label = UILabel()
        label.text = text
        label.textColor = .white
        label.textAlignment = .center
        label.numberOfLines = 0
        label.font = .preferredFont(forTextStyle: .body)
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            label.leadingAnchor.constraint(
                greaterThanOrEqualTo: view.leadingAnchor,
                constant: 32
            ),
            label.trailingAnchor.constraint(
                lessThanOrEqualTo: view.trailingAnchor,
                constant: -32
            ),
        ])
    }

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard
            !handled,
            let object = metadataObjects.first
                as? AVMetadataMachineReadableCodeObject,
            let value = object.stringValue
        else { return }
        handled = true
        session.stopRunning()
        onCode?(value)
    }
}
