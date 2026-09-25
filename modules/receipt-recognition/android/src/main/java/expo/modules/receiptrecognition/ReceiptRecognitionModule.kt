package expo.modules.receiptrecognition

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import com.googlecode.tesseract.android.TessBaseAPI
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream

private class ReadFailed(message: String) : CodedException(message)

class ReceiptRecognitionModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw ReadFailed("Нет контекста")

  override fun definition() = ModuleDefinition {
    Name("ReceiptRecognition")

    Function("supportedVisionLanguages") {
      emptyList<String>()
    }

    AsyncFunction("readVision") { _: String, _: String? ->
      throw ReadFailed("Vision читает кадр на iOS")
    }

    AsyncFunction("readTesseract") { file: String ->
      read(file)
    }
  }

  private fun read(file: String): List<String> {
    val api = TessBaseAPI()
    val bitmap = decodeUpright(filesystemPath(file))
    try {
      if (!api.init(ensureDataPath(), "rus+bel")) {
        throw ReadFailed("Tesseract не открыл модели rus и bel")
      }
      api.setImage(bitmap)
      val text = api.getUTF8Text() ?: ""
      return text.split('\n').map { it.trimEnd() }.filter { it.isNotEmpty() }
    } finally {
      api.recycle()
      bitmap.recycle()
    }
  }

  private fun ensureDataPath(): String {
    val root = File(context.filesDir, "tesseract")
    val tessdata = File(root, "tessdata")
    if (!tessdata.exists() && !tessdata.mkdirs()) {
      throw ReadFailed("Не удалось подготовить модели")
    }
    for (model in listOf("rus", "bel")) {
      val dest = File(tessdata, "$model.traineddata")
      if (dest.exists() && dest.length() > 0L) {
        continue
      }
      context.assets.open("tessdata/$model.traineddata").use { input ->
        FileOutputStream(dest).use { output -> input.copyTo(output) }
      }
    }
    return root.absolutePath
  }

  private fun filesystemPath(file: String): String {
    if (!file.startsWith("file://")) {
      return file
    }
    return Uri.parse(file).path ?: throw ReadFailed("Кадр не читается")
  }

  private fun decodeUpright(path: String): Bitmap {
    val bitmap = BitmapFactory.decodeFile(path) ?: throw ReadFailed("Кадр не читается")
    val rotation = when (
      ExifInterface(path).getAttributeInt(
        ExifInterface.TAG_ORIENTATION,
        ExifInterface.ORIENTATION_NORMAL,
      )
    ) {
      ExifInterface.ORIENTATION_ROTATE_90 -> 90
      ExifInterface.ORIENTATION_ROTATE_180 -> 180
      ExifInterface.ORIENTATION_ROTATE_270 -> 270
      else -> 0
    }
    if (rotation == 0) {
      return bitmap
    }
    val matrix = Matrix()
    matrix.postRotate(rotation.toFloat())
    val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    if (rotated != bitmap) {
      bitmap.recycle()
    }
    return rotated
  }
}
