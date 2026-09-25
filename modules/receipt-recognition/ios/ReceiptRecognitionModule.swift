import ExpoModulesCore
import Vision

private final class RecognitionException: Exception {
  private let text: String

  init(_ text: String) {
    self.text = text
  }

  override var reason: String {
    text
  }
}

public class ReceiptRecognitionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReceiptRecognition")

    Function("supportedVisionLanguages") { () -> [String] in
      (try? VNRecognizeTextRequest.supportedRecognitionLanguages(
        for: .accurate,
        revision: VNRecognizeTextRequest.currentRevision
      )) ?? []
    }

    AsyncFunction("readVision") { (file: String, language: String?) -> [String] in
      guard let url = Self.fileURL(file) else {
        throw RecognitionException("Кадр не читается")
      }
      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      if let language, !language.isEmpty {
        request.recognitionLanguages = [language]
      }
      let handler = VNImageRequestHandler(url: url, options: [:])
      try handler.perform([request])
      let observations = request.results ?? []
      return observations
        .sorted { left, right in
          if abs(left.boundingBox.midY - right.boundingBox.midY) > 0.01 {
            return left.boundingBox.midY > right.boundingBox.midY
          }
          return left.boundingBox.minX < right.boundingBox.minX
        }
        .compactMap { $0.topCandidates(1).first?.string }
    }

    AsyncFunction("readTesseract") { (_: String) -> [String] in
      throw RecognitionException("Tesseract читает кадр на Android")
    }
  }

  private static func fileURL(_ file: String) -> URL? {
    if file.hasPrefix("file://") {
      return URL(string: file)
    }
    return URL(fileURLWithPath: file)
  }
}
