import Foundation
import CoreText
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let manager = FileManager.default
let catalogue = URL(fileURLWithPath: "src/client/emoji-codes.json")
let output = URL(fileURLWithPath: ".tmp/asset-packs/apple-emoji")
try manager.createDirectory(at: output, withIntermediateDirectories: true)
let keys = try JSONSerialization.jsonObject(with: Data(contentsOf: catalogue)) as! [String]
let font = CTFontCreateWithName("AppleColorEmoji" as CFString, 104, nil)
let size = 128
var rendered: [String] = []
for key in keys {
    let scalars = key.split(separator: "-").compactMap { UInt32($0, radix: 16).flatMap(UnicodeScalar.init) }
    guard !scalars.isEmpty else { continue }
    let text = String(String.UnicodeScalarView(scalars))
    let value = NSAttributedString(string: text, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font])
    let line = CTLineCreateWithAttributedString(value)
    let runs = CTLineGetGlyphRuns(line) as! [CTRun]
    guard runs.allSatisfy({ run in
        let attributes = CTRunGetAttributes(run) as NSDictionary
        guard let selected = attributes[kCTFontAttributeName] else { return false }
        return CTFontCopyPostScriptName(selected as! CTFont) as String == "AppleColorEmoji"
    }) else { continue }
    guard let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: size * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { fatalError("Cannot create bitmap") }
    context.setAllowsAntialiasing(true)
    context.setShouldAntialias(true)
    context.textMatrix = .identity
    let bounds = CTLineGetImageBounds(line, context)
    guard !bounds.isEmpty, bounds.width > 0 else { continue }
    context.textPosition = CGPoint(x: (CGFloat(size) - bounds.width) / 2 - bounds.minX, y: (CGFloat(size) - bounds.height) / 2 - bounds.minY)
    CTLineDraw(line, context)
    guard let image = context.makeImage(), let destination = CGImageDestinationCreateWithURL(output.appendingPathComponent(key + ".png") as CFURL, UTType.png.identifier as CFString, 1, nil) else { fatalError("Cannot write image") }
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else { fatalError("Cannot finish image") }
    rendered.append(key)
}
let data = try JSONSerialization.data(withJSONObject: ["font": "Apple Color Emoji", "pixels": size, "codes": rendered], options: [.sortedKeys])
try data.write(to: output.appendingPathComponent("index.json"))
print("Rendered \(rendered.count) Apple emoji images")
