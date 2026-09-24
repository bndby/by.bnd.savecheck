# Оболочка Expo и раздельное распознавание

Приложение одного владельца хранит чеки только на телефоне, поэтому сборка — Expo development build, а не Expo Go: свой нативный код в Go не встаёт. Кадр снимает `expo-camera`, распознавание идёт по уже снятому файлу. Один локальный Expo-модуль отдаёт строки текста. На iOS это Apple Vision в режиме accurate с языком `ru-RU`, если система его поддерживает. На Android это Tesseract 5 с моделями `rus` и `bel` внутри сборки: ML Kit Text Recognition v2 кириллицу не читает, а готовый `react-native-tesseract-ocr` не собирает iOS.

## Considered Options

- Expo Go или bare React Native CLI.
- Живой разбор кадров через React Native Vision Camera и плагины OCR поверх ML Kit (`expo-ocr-kit`, `react-native-nitro-ocr`, Vision Camera OCR).
- `react-native-tesseract-ocr` как общий движок обеих платформ.
