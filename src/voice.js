// voice.js
// Ses tanıma modülü (Türkçe)

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "tr-TR";
  recognition.continuous = true;
  recognition.interimResults = false;

  // Normalize fonksiyonu (yumuşak harfleri düzeltir)
  function normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");
  }

  // Ses sonucu geldiğinde tetiklenir
  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    const normalized = normalizeText(transcript);

    console.log("🎙️ Kullanıcı dedi ki:", transcript);
    console.log("🔄 Normalize:", normalized);

    // app.js'e gönder
    if (typeof handleVoiceCommand === "function") {
      handleVoiceCommand(normalized, transcript);
    }
  };

  recognition.onerror = (event) => {
    console.error("❌ Ses tanıma hatası:", event.error);
  };

  recognition.onend = () => {
    console.log("🔁 Ses tanıma durdu, yeniden başlatılıyor...");
    recognition.start(); // Otomatik tekrar başlat
  };

  // Başlat
  recognition.start();
  console.log("🎤 Ses tanıma başlatıldı (tr-TR)");
} else {
  alert("❌ Tarayıcınız ses tanımayı desteklemiyor!");
}
