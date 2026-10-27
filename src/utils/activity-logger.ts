import { ReadingPreferences } from '../types';
import { getPreferences, savePreferences, getUsername } from './storage';
import { readerSettingsTranslations } from './translations/reader-settings';

export interface ActivityLog {
  id: string;
  username: string;
  timestamp: string; // ISO string
  type: 'read_chapter' | 'create_bookmark' | 'delete_bookmark' | 'change_setting' | 'translate_book' | 'add_book';
  bookId?: string;
  bookTitle?: string;
  chapterTitle?: string;
  chapterIndex?: number;
  settingKey?: keyof ReadingPreferences;
  settingPrevValue?: any;
  settingNewValue?: any;
  targetLang?: string;
}

export const logActivity = (activity: Omit<ActivityLog, 'id' | 'timestamp' | 'username'>) => {
  if (typeof window === 'undefined') return;
  try {
    const username = getUsername() || 'default';
    const logsKey = `activity_logs_${username}`;
    const raw = localStorage.getItem(logsKey);
    const logs: ActivityLog[] = raw ? JSON.parse(raw) : [];
    
    const newLog: ActivityLog = {
      ...activity,
      id: Math.random().toString(36).substring(2, 9),
      username,
      timestamp: new Date().toISOString()
    };
    
    // Keep newest first, limit to 100 items to guarantee zero storage/RAM bloat
    logs.unshift(newLog);
    if (logs.length > 100) {
      logs.length = 100;
    }
    
    localStorage.setItem(logsKey, JSON.stringify(logs));
    
    // Dispatch event with microtask to avoid blocking active interaction
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => {
        window.dispatchEvent(new Event('activity_logs_updated'));
      });
    } else {
      window.dispatchEvent(new Event('activity_logs_updated'));
    }
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

const ENABLED_DISABLED_MAP: Record<string, { enabled: string; disabled: string }> = {
  en: { enabled: "Enabled", disabled: "Disabled" },
  pt: { enabled: "Ativado", disabled: "Desativado" },
  es: { enabled: "Activado", disabled: "Desactivado" },
  fr: { enabled: "Activé", disabled: "Désactivé" },
  de: { enabled: "Aktiviert", disabled: "Deaktiviert" },
  it: { enabled: "Abilitato", disabled: "Disabilitato" },
  ru: { enabled: "Включено", disabled: "Отключено" },
  ja: { enabled: "有効", disabled: "無効" },
  ko: { enabled: "활성화됨", disabled: "비활성화됨" },
  zh: { enabled: "已启用", disabled: "已禁用" },
  ar: { enabled: "مفعّل", disabled: "معطّل" },
  hi: { enabled: "सक्षम", disabled: "अक्षम" },
  tr: { enabled: "Etkin", disabled: "Devre Dışı" },
  sw: { enabled: "Imewezeshwa", disabled: "Imelemazwa" },
  bn: { enabled: "সক্রিয়", disabled: "নিষ্ক্রিয়" },
  id: { enabled: "Diaktifkan", disabled: "Dinonaktifkan" },
  yo: { enabled: "Muu ṣiṣẹ", disabled: "Muu duro" },
  nl: { enabled: "Ingeschakeld", disabled: "Uitgeschakeld" },
  th: { enabled: "เปิดใช้งาน", disabled: "ปิดใช้งาน" },
  ur: { enabled: "فعال", disabled: "غیر فعال" }
};

const ACTION_TEMPLATES: Record<string, Record<string, string>> = {
  read_chapter: {
    en: "Read {chapter} of \"{book}\"",
    pt: "Leu {chapter} de \"{book}\"",
    es: "Leyó {chapter} de \"{book}\"",
    fr: "A lu {chapter} de \"{book}\"",
    de: "{chapter} von \"{book}\" gelesen",
    it: "Letto {chapter} di \"{book}\"",
    ru: "Прочитана {chapter} книги «{book}»",
    ja: "「{book}」の{chapter}を読みました",
    ko: "「{book}」의 {chapter}을(를) 읽었습니다",
    zh: "阅读了《{book}》的{chapter}",
    ar: "قرأ {chapter} من \"{book}\"",
    hi: "\"{book}\" का {chapter} पढ़ा",
    tr: "\"{book}\" kitabının {chapter} bölümü okundu",
    sw: "Alisoma {chapter} ya \"{book}\"",
    bn: "\"{book}\"-এর {chapter} পড়েছেন",
    id: "Membaca {chapter} dari \"{book}\"",
    yo: "Ka {chapter} ti \"{book}\"",
    nl: "{chapter} van \"{book}\" gelezen",
    th: "อ่าน {chapter} ของ \"{book}\"",
    ur: "\"{book}\" کا {chapter} پڑھا"
  },
  create_bookmark: {
    en: "Created bookmark in \"{book}\" - {chapter}",
    pt: "Criou marcador em \"{book}\" - {chapter}",
    es: "Creó un marcador en \"{book}\" - {chapter}",
    fr: "A créé un signet dans \"{book}\" - {chapter}",
    de: "Lesezeichen in \"{book}\" - {chapter} erstellt",
    it: "Segnalibro creato in \"{book}\" - {chapter}",
    ru: "Создана закладка в «{book}» — {chapter}",
    ja: "「{book}」の{chapter}にブックマークを作成しました",
    ko: "「{book}」의 {chapter}에 북마크를 생성했습니다",
    zh: "在《{book}》- {chapter}中创建了书签",
    ar: "تم إنشاء إشارة مرجعية في \"{book}\" - {chapter}",
    hi: "\"{book}\" - {chapter} में बुकमार्क बनाया",
    tr: "\"{book}\" - {chapter} için yer işareti oluşturuldu",
    sw: "Iliunda alama katika \"{book}\" - {chapter}",
    bn: "\"{book}\" - {chapter}-এ বুকমার্ক তৈরি করেছেন",
    id: "Membuat penanda di \"{book}\" - {chapter}",
    yo: "Ṣẹda àmì ìwé ninu \"{book}\" - {chapter}",
    nl: "Bladwijzer gemaakt in \"{book}\" - {chapter}",
    th: "สร้างที่คั่นหน้าใน \"{book}\" - {chapter}",
    ur: "\"{book}\" - {chapter} میں بک مارک بنایا"
  },
  delete_bookmark: {
    en: "Deleted bookmark from \"{book}\"",
    pt: "Excluiu marcador de \"{book}\"",
    es: "Eliminó un marcador de \"{book}\"",
    fr: "A supprimé un signet de \"{book}\"",
    de: "Lesezeichen aus \"{book}\" gelöscht",
    it: "Segnalibro eliminato da \"{book}\"",
    ru: "Удалена закладка из «{book}»",
    ja: "「{book}」からブックマークを削除しました",
    ko: "「{book}」에서 북마크를 삭제했습니다",
    zh: "从《{book}》中删除了书签",
    ar: "تم حذف إشارة مرجعية من \"{book}\"",
    hi: "\"{book}\" से बुकमार्क हटाया",
    tr: "\"{book}\" kitabından yer işareti silindi",
    sw: "Ilifuta alama kutoka \"{book}\"",
    bn: "\"{book}\" থেকে বুকমার্ক মুছে ফেলেছেন",
    id: "Menghapus penanda dari \"{book}\"",
    yo: "Pa àmì ìwé rẹ́ lati \"{book}\"",
    nl: "Bladwijzer verwijderd uit \"{book}\"",
    th: "ลบที่คั่นหน้าออกจาก \"{book}\"",
    ur: "\"{book}\" سے بک مارک حذف کیا"
  },
  change_setting: {
    en: "Changed setting \"{setting}\" from \"{prev}\" to \"{next}\"",
    pt: "Alterou configuração \"{setting}\" de \"{prev}\" para \"{next}\"",
    es: "Cambió el ajuste \"{setting}\" de \"{prev}\" a \"{next}\"",
    fr: "A modifié le paramètre \"{setting}\" de \"{prev}\" à \"{next}\"",
    de: "Einstellung \"{setting}\" von \"{prev}\" auf \"{next}\" geändert",
    it: "Modificata impostazione \"{setting}\" da \"{prev}\" a \"{next}\"",
    ru: "Настройка «{setting}» изменена с «{prev}» на «{next}»",
    ja: "設定「{setting}」を「{prev}」から「{next}」に変更しました",
    ko: "설정 \"{setting}\"을(를) \"{prev}\"에서 \"{next}\"(으)로 변경했습니다",
    zh: "将设置“{setting}”从“{prev}”更改为“{next}”",
    ar: "تم تغيير الإعداد \"{setting}\" من \"{prev}\" إلى \"{next}\"",
    hi: "सेटिंग \"{setting}\" को \"{prev}\" से \"{next}\" में बदला",
    tr: "\"{setting}\" ayarı \"{prev}\" değerinden \"{next}\" değerine değiştirildi",
    sw: "Ilibadilisha mpangilio \"{setting}\" kutoka \"{prev}\" hadi \"{next}\"",
    bn: "\"{setting}\" সেটিং \"{prev}\" থেকে \"{next}\"-এ পরিবর্তন করা হয়েছে",
    id: "Mengubah pengaturan \"{setting}\" dari \"{prev}\" ke \"{next}\"",
    yo: "Yi eto \"{setting}\" pada lati \"{prev}\" si \"{next}\"",
    nl: "Instelling \"{setting}\" gewijzigd van \"{prev}\" naar \"{next}\"",
    th: "เปลี่ยนการตั้งค่า \"{setting}\" จาก \"{prev}\" เป็น \"{next}\"",
    ur: "سیٹنگ \"{setting}\" کو \"{prev}\" سے \"{next}\" میں تبدیل کیا"
  },
  translate_book: {
    en: "Translated entire book \"{book}\" to {lang}",
    pt: "Traduziu o livro inteiro \"{book}\" para {lang}",
    es: "Tradujo el libro completo \"{book}\" a {lang}",
    fr: "A traduit tout le livre \"{book}\" en {lang}",
    de: "Das gesamte Buch \"{book}\" nach {lang} übersetzt",
    it: "Tradotto l'intero libro \"{book}\" in {lang}",
    ru: "Переведена вся книга «{book}» на {lang}",
    ja: "「{book}」を一冊丸ごと{lang}に翻訳しました",
    ko: "도서 전체「{book}」을(를) {lang}(으)로 번역했습니다",
    zh: "将整本书《{book}》翻译为{lang}",
    ar: "تمت ترجمة الكتاب بأكمله \"{book}\" إلى {lang}",
    hi: "पूरी किताब \"{book}\" को {lang} में अनुवादित किया",
    tr: "\"{book}\" kitabının tamamı {lang} diline çevrildi",
    sw: "Ilitafsiri kitabu kizima \"{book}\" kwenda {lang}",
    bn: "সম্পূর্ণ বই \"{book}\" {lang}-এ অনুবাদ করা হয়েছে",
    id: "Menerjemahkan seluruh buku \"{book}\" ke {lang}",
    yo: "Tumọ gbogbo iwe \"{book}\" si {lang}",
    nl: "Het hele boek \"{book}\" vertaald naar {lang}",
    th: "แปลหนังสือทั้งเล่ม \"{book}\" เป็น {lang}",
    ur: "پوری کتاب \"{book}\" کا {lang} میں ترجمہ کیا"
  },
  add_book: {
    en: "Added \"{book}\" to bookshelf",
    pt: "Adicionou \"{book}\" à estante",
    es: "Añadió \"{book}\" a la biblioteca",
    fr: "A ajouté \"{book}\" à la bibliothèque",
    de: "\"{book}\" zum Bücherregal hinzugefügt",
    it: "Aggiunto \"{book}\" alla libreria",
    ru: "Книга «{book}» добавлена на полку",
    ja: "「{book}」を本棚に追加しました",
    ko: "「{book}」을(를) 서재에 추가했습니다",
    zh: "已将《{book}》添加到书架",
    ar: "تمت إضافة \"{book}\" إلى رف الكتب",
    hi: "\"{book}\" को बुकशेल्फ़ में जोड़ा",
    tr: "\"{book}\" kitaplığa eklendi",
    sw: "Iliongeza \"{book}\" kwenye rafu ya vitabu",
    bn: "\"{book}\" বুকশেলফে যোগ করা হয়েছে",
    id: "Menambahkan \"{book}\" ke rak buku",
    yo: "Fi \"{book}\" kun pẹpẹ iwe",
    nl: "\"{book}\" toegevoegd aan boekenplank",
    th: "เพิ่ม \"{book}\" ลงในชั้นหนังสือ",
    ur: "\"{book}\" کو کتابوں کی الماری میں شامل کیا"
  }
};

const VALUE_TRANSLATIONS_MAP: Record<string, Record<string, string>> = {
  both: {
    en: "Both", pt: "Ambos", es: "Ambos", fr: "Les deux", de: "Beide",
    it: "Entrambi", ru: "Оба", ja: "両方", ko: "모두", zh: "两者",
    ar: "كلاهما", hi: "दोनों", tr: "Her ikisi", sw: "Zote mbili", bn: "উভয়",
    id: "Keduanya", yo: "Méjèèjì", nl: "Beide", th: "ทั้งสอง", ur: "دونوں"
  },
  reader: {
    en: "Reader", pt: "Leitor", es: "Lector", fr: "Lecteur", de: "Leser",
    it: "Lettore", ru: "Область чтения", ja: "リーダー", ko: "리더", zh: "阅读区",
    ar: "القارئ", hi: "रीडर", tr: "Okuyucu", sw: "Msomaji", bn: "পাঠক",
    id: "Pembaca", yo: "Olùkà", nl: "Lezer", th: "ผู้อ่าน", ur: "ریڈر"
  },
  interface: {
    en: "Interface", pt: "Interface", es: "Interfaz", fr: "Interface", de: "Oberfläche",
    it: "Interfaccia", ru: "Интерфейс", ja: "インターフェース", ko: "인터페이스", zh: "界面",
    ar: "الواجهة", hi: "इंटरफ़ेस", tr: "Arayüz", sw: "Kiolesura", bn: "ইন্টারফেস",
    id: "Antarmuka", yo: "Oju-ọna", nl: "Interface", th: "อินเทอร์เฟซ", ur: "انٹرفیس"
  },
  classic: {
    en: "Classic", pt: "Clássico", es: "Clásico", fr: "Classique", de: "Klassisch",
    it: "Classico", ru: "Классический", ja: "クラシック", ko: "클래식", zh: "经典",
    ar: "كلاسيكي", hi: "क्लासिक", tr: "Klasik", sw: "Kawaida", bn: "ক্লাসিক",
    id: "Klasik", yo: "Àtọwọ́dọ́wọ́", nl: "Klassiek", th: "คลาสสิก", ur: "کلاسک"
  },
  wood: {
    en: "Elegant Wood", pt: "Madeira Elegante", es: "Madera Elegante", fr: "Bois élégant", de: "Elegantes Holz",
    it: "Legno elegante", ru: "Элегантное дерево", ja: "エレガントウッド", ko: "우아한 우드", zh: "优雅木纹",
    ar: "خشب أنيق", hi: "सुरुचिपूर्ण लकड़ी", tr: "Zarif Ahşap", sw: "Mbao ya Kifahari", bn: "মার্জিত কাঠ",
    id: "Kayu Elegan", yo: "Igi Dáradára", nl: "Elegant hout", th: "ไม้ที่หรูหรา", ur: "خوبصورت لکڑی"
  },
  wooden: {
    en: "Wood", pt: "Madeira", es: "Madera", fr: "Bois", de: "Holz",
    it: "Legno", ru: "Дерево", ja: "ウッド", ko: "우드", zh: "木纹",
    ar: "خشب", hi: "लकड़ी", tr: "Ahşap", sw: "Mbao", bn: "কাঠ",
    id: "Kayu", yo: "Igi", nl: "Hout", th: "ไม้", ur: "لکڑی"
  },
  glass: {
    en: "Glass", pt: "Vidro", es: "Cristal", fr: "Verre", de: "Glas",
    it: "Vetro", ru: "Стекло", ja: "ガラス", ko: "유리", zh: "玻璃",
    ar: "زجاج", hi: "ग्लास", tr: "Cam", sw: "Kioo", bn: "গ্লাস",
    id: "Kaca", yo: "Digi", nl: "Glas", th: "กระจก", ur: "گلاس"
  },
  neon: {
    en: "Neon", pt: "Neon", es: "Neón", fr: "Néon", de: "Neon",
    it: "Neon", ru: "Неон", ja: "ネオン", ko: "네온", zh: "霓虹",
    ar: "نيون", hi: "नियॉन", tr: "Neon", sw: "Neoni", bn: "নিয়ন",
    id: "Neon", yo: "Neon", nl: "Neon", th: "นีออน", ur: "نیین"
  },
  retro8bit: {
    en: "Retro 8-bit", pt: "Retrô 8-bit", es: "Retro 8 bits", fr: "Rétro 8 bits", de: "Retro 8-Bit",
    it: "Retro 8-bit", ru: "Ретро 8-бит", ja: "レトロ8ビット", ko: "레트로 8비트", zh: "复古8位",
    ar: "ريترو 8 بت", hi: "रेट्रो 8-बिट", tr: "Retro 8-bit", sw: "Retro ya biti 8", bn: "রেট্রো ৮-বিট",
    id: "Retro 8-bit", yo: "Retro 8-bit", nl: "Retro 8-bits", th: "เรโทร 8 บิต", ur: "ریٹرو 8 بٹ"
  },
  tinted: {
    en: "Tinted", pt: "Colorido", es: "Teñido", fr: "Teinté", de: "Getönt",
    it: "Colorato", ru: "Тонированный", ja: "着色", ko: "틴티드", zh: "着色",
    ar: "ملون", hi: "रंगीन", tr: "Renkli", sw: "Rangi", bn: "রঙিন",
    id: "Berwarna", yo: "Àwọ̀", nl: "Getint", th: "ย้อมสี", ur: "رنگین"
  },
  snowy: {
    en: "Snow ❄️", pt: "Neve ❄️", es: "Nieve ❄️", fr: "Neige ❄️", de: "Schnee ❄️",
    it: "Neve ❄️", ru: "Снег ❄️", ja: "雪 ❄️", ko: "스노우 ❄️", zh: "雪花 ❄️",
    ar: "ثلج ❄️", hi: "बर्फ़ ❄️", tr: "Kar ❄️", sw: "Theluji ❄️", bn: "তুষার ❄️",
    id: "Salju ❄️", yo: "Yìnyín ❄️", nl: "Sneeuw ❄️", th: "หิมะ ❄️", ur: "برف ❄️"
  },
  aurora: {
    en: "Aurora Flow 🌌", pt: "Fluxo de Aurora 🌌", es: "Flujo de Aurora 🌌", fr: "Flux d'aurore 🌌", de: "Aurorastrom 🌌",
    it: "Flusso aurora 🌌", ru: "Северное сияние 🌌", ja: "オーロラ 🌌", ko: "오로라 플로우 🌌", zh: "极光流动 🌌",
    ar: "تدفق الشفق 🌌", hi: "ऑरोरा प्रवाह 🌌", tr: "Kutup Işığı 🌌", sw: "Mtiririko wa Aurora 🌌", bn: "অরোরা প্রবাহ 🌌",
    id: "Aliran Aurora 🌌", yo: "Ṣiṣan Aurora 🌌", nl: "Aurora-stroom 🌌", th: "ออโรร่า 🌌", ur: "شفق بہاؤ 🌌"
  },
  day: {
    en: "Day", pt: "Dia", es: "Día", fr: "Jour", de: "Tag",
    it: "Giorno", ru: "День", ja: "昼", ko: "낮", zh: "白天",
    ar: "نهار", hi: "दिन", tr: "Gündüz", sw: "Mchana", bn: "দিন",
    id: "Siang", yo: "Ọjọ́", nl: "Dag", th: "กลางวัน", ur: "دن"
  },
  night: {
    en: "Night", pt: "Noite", es: "Noche", fr: "Nuit", de: "Nacht",
    it: "Notte", ru: "Ночь", ja: "夜", ko: "밤", zh: "夜晚",
    ar: "ليل", hi: "रात", tr: "Gece", sw: "Usiku", bn: "রাত",
    id: "Malam", yo: "Oru", nl: "Nacht", th: "กลางคืน", ur: "رات"
  },
  midnight: {
    en: "Midnight", pt: "Meia-noite", es: "Medianoche", fr: "Minuit", de: "Mitternacht",
    it: "Mezzanotte", ru: "Полночь", ja: "真夜中", ko: "자정", zh: "午夜",
    ar: "منتصف الليل", hi: "आधी रात", tr: "Gece Yarısı", sw: "Usiku wa manane", bn: "मध्यরাত",
    id: "Tengah Malam", yo: "Àbọ̀-òru", nl: "Middernacht", th: "เที่ยงคืน", ur: "آدھی رات"
  },
  light: {
    en: "Light", pt: "Claro", es: "Claro", fr: "Clair", de: "Hell",
    it: "Chiaro", ru: "Светлая", ja: "ライト", ko: "밝게", zh: "浅色",
    ar: "فاتح", hi: "हल्का", tr: "Açık", sw: "Nuru", bn: "হালকা",
    id: "Terang", yo: "Ìtànṣán", nl: "Licht", th: "สว่าง", ur: "روشن"
  },
  dark: {
    en: "Dark", pt: "Escuro", es: "Oscuro", fr: "Sombre", de: "Dunkel",
    it: "Scuro", ru: "Темная", ja: "ダーク", ko: "어둡게", zh: "深色",
    ar: "داكن", hi: "गहरा", tr: "Koyu", sw: "Giza", bn: "অন্ধকার",
    id: "Gelap", yo: "Òkùnkùn", nl: "Donker", th: "มืด", ur: "تاریک"
  },
  sepia: {
    en: "Sepia", pt: "Sépia", es: "Sepia", fr: "Sépia", de: "Sepia",
    it: "Seppia", ru: "Сепия", ja: "セピア", ko: "세피아", zh: "褐色",
    ar: "بني داكن", hi: "सेपिया", tr: "Sepya", sw: "Sepia", bn: "সেপিয়া",
    id: "Sepia", yo: "Sepia", nl: "Sepia", th: "ซีเปีย", ur: "سیپیا"
  },
  highcontrast: {
    en: "High Contrast", pt: "Alto Contraste", es: "Alto Contraste", fr: "Contraste élevé", de: "Hoher Kontrast",
    it: "Contrasto elevato", ru: "Высокая контрастность", ja: "ハイコントラスト", ko: "고대비", zh: "高对比度",
    ar: "تباين عالي", hi: "उच्च कंट्रास्ट", tr: "Yüksek Kontrast", sw: "Tofauti Kubwa", bn: "উচ্চ বৈসাদৃশ্য",
    id: "Kontras Tinggi", yo: "Iyatọ Giga", nl: "Hoog contrast", th: "ความคมชัดสูง", ur: "زیادہ تضاد"
  },
  ocean: {
    en: "Ocean", pt: "Oceano", es: "Océano", fr: "Océan", de: "Ozean",
    it: "Oceano", ru: "Океан", ja: "オーシャン", ko: "오션", zh: "海洋",
    ar: "محيط", hi: "महासागर", tr: "Okyanus", sw: "Bahari", bn: "মহাসাগর",
    id: "Samudra", yo: "Okun", nl: "Oceaan", th: "มหาสมุทร", ur: "سمندر"
  },
  forest: {
    en: "Forest", pt: "Floresta", es: "Bosque", fr: "Forêt", de: "Wald",
    it: "Foresta", ru: "Лес", ja: "フォレスト", ko: "포레스트", zh: "森林",
    ar: "غابة", hi: "वन", tr: "Orman", sw: "Msitu", bn: "বন",
    id: "Hutan", yo: "Igbo", nl: "Woud", th: "ป่า", ur: "جنگل"
  },
  sunset: {
    en: "Sunset", pt: "Pôr do Sol", es: "Atardecer", fr: "Coucher de soleil", de: "Sonnenuntergang",
    it: "Tramonto", ru: "Закат", ja: "サンセット", ko: "선셋", zh: "日落",
    ar: "غروب", hi: "सूर्यास्त", tr: "Gün Batımı", sw: "Machweo", bn: "সূর্যাস্ত",
    id: "Matahari Terbenam", yo: "Ìwọ-oòrùn", nl: "Zonsondergang", th: "พระอาทิตย์ตก", ur: "غروب آفتاب"
  },
  lavender: {
    en: "Lavender", pt: "Lavanda", es: "Lavanda", fr: "Lavande", de: "Lavendel",
    it: "Lavanda", ru: "Лаванда", ja: "ラベンダー", ko: "라벤더", zh: "薰衣草",
    ar: "خزامى", hi: "लैवेंडर", tr: "Lavanta", sw: "Lavenda", bn: "ল্যাভেন্ডার",
    id: "Lavender", yo: "Lavender", nl: "Lavendel", th: "ลาเวนเดอร์", ur: "لیوینڈر"
  }
};

const SETTING_NAMES_MAP: Record<string, Record<string, string>> = {
  theme: {
    en: "Reading Theme", pt: "Tema de Leitura", es: "Tema de Lectura", fr: "Thème de lecture", de: "Lesedesign",
    it: "Tema di lettura", ru: "Тема чтения", ja: "読書テーマ", ko: "독서 테마", zh: "阅读主题",
    ar: "سمة القراءة", hi: "पठन थीम", tr: "Okuma Teması", sw: "Mandhari ya Kusoma", bn: "পড়ার থিম",
    id: "Tema Membaca", yo: "Àkòrí Kíkà", nl: "Leesthema", th: "ธีมการอ่าน", ur: "پڑھنے کی تھیم"
  },
  selectedColorTheme: {
    en: "Color Theme", pt: "Tema de Cores", es: "Tema de Color", fr: "Thème de couleur", de: "Farbthema",
    it: "Tema colore", ru: "Цветовая тема", ja: "カラーテーマ", ko: "색상 테마", zh: "色彩主题",
    ar: "سمة اللون", hi: "रंग थीम", tr: "Renk Teması", sw: "Mandhari ya Rangi", bn: "রঙের থিম",
    id: "Tema Warna", yo: "Àkòrí Àwọ̀", nl: "Kleurthema", th: "ธีมสี", ur: "رنگین تھیم"
  },
  selectedInterfaceTheme: {
    en: "Interface Theme", pt: "Tema da Interface", es: "Tema de Interfaz", fr: "Thème d'interface", de: "Oberflächendesign",
    it: "Tema interfaccia", ru: "Тема интерфейса", ja: "インターフェーステーマ", ko: "인터페이스 테마", zh: "界面主题",
    ar: "سمة الواجهة", hi: "इंटरफ़ेस थीम", tr: "Arayüz Teması", sw: "Mandhari ya Kiolesura", bn: "ইন্টারফেস থিম",
    id: "Tema Antarmuka", yo: "Àkòrí Oju-ọna", nl: "Interfacethema", th: "ธีมอินเทอร์เฟซ", ur: "انٹرفیس تھیم"
  },
  fontSize: {
    en: "Font Size", pt: "Tamanho da Fonte", es: "Tamaño de Fuente", fr: "Taille de police", de: "Schriftgröße",
    it: "Dimensione carattere", ru: "Размер шрифта", ja: "フォントサイズ", ko: "글꼴 크기", zh: "字体大小",
    ar: "حجم الخط", hi: "फ़ॉन्ट का आकार", tr: "Yazı Tipi Boyutu", sw: "Ukubwa wa Fonti", bn: "হরফের আকার",
    id: "Ukuran Font", yo: "Ìwọ̀n Lẹ́tà", nl: "Lettergrootte", th: "ขนาดตัวอักษร", ur: "فونٹ سائز"
  },
  fontFamily: {
    en: "Font Family", pt: "Família da Fonte", es: "Familia de Fuente", fr: "Famille de polices", de: "Schriftart",
    it: "Famiglia di caratteri", ru: "Семейство шрифтов", ja: "フォントファミリー", ko: "글꼴 모음", zh: "字体族",
    ar: "عائلة الخط", hi: "फ़ॉन्ट परिवार", tr: "Yazı Tipi Ailesi", sw: "Jamii ya Fonti", bn: "হরফ পরিবার",
    id: "Keluarga Font", yo: "Ẹbí Lẹ́tà", nl: "Lettertypefamilie", th: "ตระกูลแบบอักษร", ur: "فونٹ فیملی"
  },
  lineHeight: {
    en: "Line Height", pt: "Espaçamento de Linha", es: "Espaciado de Línea", fr: "Hauteur de ligne", de: "Zeilenabstand",
    it: "Altezza riga", ru: "Высота строки", ja: "行の高さ", ko: "줄 높이", zh: "行高",
    ar: "ارتفاع السطر", hi: "पंक्ति ऊंचाई", tr: "Satır Yüksekliği", sw: "Kimo cha Mstari", bn: "লাইনের উচ্চতা",
    id: "Tinggi Baris", yo: "Gíga Ìlà", nl: "Regelhoogte", th: "ความสูงของบรรทัด", ur: "لائن اونچائی"
  },
  menuStyle: {
    en: "Menu Style", pt: "Estilo do Menu", es: "Estilo de Menú", fr: "Style du menu", de: "Menüstil",
    it: "Stile menu", ru: "Стиль меню", ja: "メニュースタイル", ko: "메뉴 스타일", zh: "菜单样式",
    ar: "نمط القائمة", hi: "मेनू शैली", tr: "Menü Stili", sw: "Mtindo wa Menyu", bn: "মেনু শৈলী",
    id: "Gaya Menu", yo: "Àrà Àkójọ", nl: "Menustijl", th: "สไตล์เมนู", ur: "مینو اسٹائل"
  },
  menuSubTheme: {
    en: "Glass Subtheme", pt: "Subtema do Vidro", es: "Subtema de Cristal", fr: "Sous-thème de verre", de: "Glas-Unterthema",
    it: "Sottotema vetro", ru: "Подтема стекла", ja: "ガラスサブテーマ", ko: "글래스 배경 변형", zh: "玻璃子主题",
    ar: "السمة الفرعية للزجاج", hi: "ग्लास सब-थीम", tr: "Cam Alt Teması", sw: "Mandhari Ndogo ya Kioo", bn: "গ্লাস সাব-থিম",
    id: "Subtema Kaca", yo: "Àkòrí Kékeré Digi", nl: "Glas-subthema", th: "ธีมย่อยกระจก", ur: "گلاس سب تھیم"
  },
  glassEnabled: {
    en: "Glass Effect", pt: "Efeito de Vidro", es: "Efecto de Cristal", fr: "Effet de verre", de: "Glaseffekt",
    it: "Effetto vetro", ru: "Эффект стекла", ja: "ガラス効果", ko: "유리 효과", zh: "玻璃效果",
    ar: "تأثير الزجاج", hi: "ग्लास प्रभाव", tr: "Cam Efekti", sw: "Athari ya Kioo", bn: "গ্লাস প্রভাব",
    id: "Efek Kaca", yo: "Àbájáde Digi", nl: "Glaseffect", th: "เอฟเฟกต์กระจก", ur: "گلاس اثر"
  },
  glassOpacity: {
    en: "Glass Opacity", pt: "Opacidade do Vidro", es: "Opacidad del Cristal", fr: "Opacité du verre", de: "Glas-Opazität",
    it: "Opacità vetro", ru: "Прозрачность стекла", ja: "ガラス不透明度", ko: "유리 불투명도", zh: "玻璃不透明度",
    ar: "شفافية الزجاج", hi: "ग्लास अपारदर्शिता", tr: "Cam Opaklığı", sw: "Uwazi wa Kioo", bn: "গ্লাস অস্বচ্ছতা",
    id: "Opasitas Kaca", yo: "Ìrí Oju Digi", nl: "Glasdekking", th: "ความทึบกระจก", ur: "گلاس دھندلاپن"
  },
  glassBlur: {
    en: "Glass Blur", pt: "Desfoque do Vidro", es: "Desenfoque de Cristal", fr: "Flou du verre", de: "Glas-Unschärfe",
    it: "Sfocatura vetro", ru: "Размытие стекла", ja: "ガラスぼかし", ko: "유리 흐림", zh: "玻璃模糊",
    ar: "تمويه الزجاج", hi: "ग्लास धुंधलापन", tr: "Cam Bulanıklığı", sw: "Ukungu wa Kioo", bn: "গ্লাস ঝাপসা",
    id: "Keburaman Kaca", yo: "Ìkùnrùn Digi", nl: "Glasvage", th: "ความเบลอกระจก", ur: "گلاس بلر"
  },
  glassReaderAreaOnly: {
    en: "Glass in Reader Area Only", pt: "Vidro Apenas na Área do Leitor", es: "Cristal Solo en Área de Lectura", fr: "Verre uniquement dans la zone de lecture", de: "Glas nur im Lesebereich",
    it: "Vetro solo nell'area di lettura", ru: "Стекло только в области чтения", ja: "読書エリアのみガラス適用", ko: "독서 영역에만 글래스 적용", zh: "仅在阅读区域应用玻璃效果",
    ar: "زجاج في منطقة القراءة فقط", hi: "केवल पढ़ने के क्षेत्र में ग्लास", tr: "Yalnızca Okuma Alanında Cam", sw: "Kioo kwenye Eneo la Kusoma Tu", bn: "কেবল পড়ার এলাকায় গ্লাস",
    id: "Kaca Hanya di Area Membaca", yo: "Digi ni agbegbe kika nikan", nl: "Glas alleen in leesgedeelte", th: "ใช้กระจกเฉพาะบริเวณอ่าน", ur: "صرف پڑھنے کی جگہ پر گلاس"
  },
  sideBordersEnabled: {
    en: "Colored Side Margins", pt: "Margens Laterais Coloridas", es: "Márgenes Laterales Coloreados", fr: "Marges latérales colorées", de: "Farbige Seitenränder",
    it: "Margini laterali colorati", ru: "Цветные боковые поля", ja: "カラーサイドマージン", ko: "컬러 측면 여백", zh: "彩色侧边距",
    ar: "هوامش جانبية ملونة", hi: "रंगीन पार्श्व मार्जिन", tr: "Renkli Yan Kenar Boşlukları", sw: "Mipaka ya Kando Yenye Rangi", bn: "রঙিন পার্শ্ব মার্জিন",
    id: "Margin Samping Berwarna", yo: "Àwọn Ègbé Aláwọ̀", nl: "Gekleurde zijmarges", th: "ขอบด้านข้างแบบมีสี", ur: "رنگین سائیڈ مارجن"
  },
  sideBordersWidth: {
    en: "Side Margin Width", pt: "Largura das Margens", es: "Ancho de Margen Lateral", fr: "Largeur de marge latérale", de: "Seitenrandbreite",
    it: "Larghezza margine laterale", ru: "Ширина боковых полей", ja: "余白幅", ko: "여백 너비", zh: "侧边距宽度",
    ar: "عرض الهامش الجانبي", hi: "पार्श्व मार्जिन चौड़ाई", tr: "Yan Kenar Genişliği", sw: "Upana wa Upande", bn: "পার্শ্ব মার্জিন প্রস্থ",
    id: "Lebar Margin Samping", yo: "Iwọn Ègbé", nl: "Zijmarge breedte", th: "ความกว้างขอบข้าง", ur: "سائیڈ مارجن چوڑائی"
  },
  interfaceSnowyEnabled: {
    en: "Snow Effect", pt: "Efeito de Neve", es: "Efecto de Nieve", fr: "Effet de neige", de: "Schneeeffekt",
    it: "Effetto neve", ru: "Эффект снега", ja: "雪の効果", ko: "눈 효과 ❄️", zh: "雪花效果",
    ar: "تأثير الثلج", hi: "बर्फ़ प्रभाव", tr: "Kar Efekti", sw: "Athari ya Theluji", bn: "তুষার প্রভাব",
    id: "Efek Salju", yo: "Àbájáde Yìnyín", nl: "Sneeuweffect", th: "เอฟเฟกต์หิมะ", ur: "برف کا اثر"
  },
  interfaceRainEnabled: {
    en: "Rain Effect", pt: "Efeito de Chuva", es: "Efecto de Lluvia", fr: "Effet de pluie", de: "Regeneffekt",
    it: "Effetto pioggia", ru: "Эффект дождя", ja: "雨の効果", ko: "비 효과 🌧️", zh: "雨滴效果",
    ar: "تأثير المطر", hi: "बारिश प्रभाव", tr: "Yağmur Efekti", sw: "Athari ya Mvua", bn: "বৃষ্টির প্রভাব",
    id: "Efek Hujan", yo: "Àbájáde Òjò", nl: "Regeneffect", th: "เอฟเฟกต์ฝน", ur: "بارش کا اثر"
  },
  interfacePetalsEnabled: {
    en: "Petals Effect", pt: "Efeito de Pétalas", es: "Efecto de Pétalas", fr: "Effet de pétales", de: "Blütenblatteffekt",
    it: "Effetto petali", ru: "Эффект лепестков", ja: "花びら効果", ko: "꽃잎 효과 🌸", zh: "花瓣效果",
    ar: "تأثير بتلات الزهور", hi: "पंखुड़ी प्रभाव", tr: "Taç Yaprağı Efekti", sw: "Athari ya Petali", bn: "পাপড়ি প্রভাব",
    id: "Efek Kelopak", yo: "Àbájáde Ẹ̀wù Odòdó", nl: "Bloemblaadjes effect", th: "เอฟเฟกต์กลีบดอกไม้", ur: "پنکھڑیوں کا اثر"
  },
  interfaceSnowyMode: {
    en: "Snow Effect Mode", pt: "Modo do Efeito de Neve", es: "Modo de Efecto de Nieve", fr: "Mode d'effet de neige", de: "Schneeeffekt-Modus",
    it: "Modalità effetto neve", ru: "Режим эффекта снега", ja: "雪エフェクトモード", ko: "눈 효과 모드", zh: "雪花效果模式",
    ar: "وضع تأثير الثلج", hi: "बर्फ प्रभाव मोड", tr: "Kar Efekti Modu", sw: "Njia ya Athari ya Theluji", bn: "তুষার প্রভাব মোড",
    id: "Mode Efek Salju", yo: "Ipò Àbájáde Yìnyín", nl: "Sneeuweffectmodus", th: "โหมดเอฟเฟกต์หิมะ", ur: "برف اثر موڈ"
  },
  interfaceRainMode: {
    en: "Rain Effect Mode", pt: "Modo do Efeito de Chuva", es: "Modo de Efecto de Lluvia", fr: "Mode d'effet de pluie", de: "Regeneffekt-Modus",
    it: "Modalità effetto pioggia", ru: "Режим эффекта дождя", ja: "雨エフェクトモード", ko: "비 효과 모드", zh: "雨滴效果模式",
    ar: "وضع تأثير المطر", hi: "बारिश प्रभाव मोड", tr: "Yağmur Efekti Modu", sw: "Njia ya Athari ya Mvua", bn: "বৃষ্টির প্রভাব মোড",
    id: "Mode Efek Hujan", yo: "Ipò Àbájáde Òjò", nl: "Regeneffectmodus", th: "โหมดเอฟเฟกต์ฝน", ur: "بارش اثر موڈ"
  },
  interfacePetalsMode: {
    en: "Petals Effect Mode", pt: "Modo do Efeito de Pétalas", es: "Modo de Efecto de Pétalos", fr: "Mode d'effet de pétales", de: "Blütenblatteffekt-Modus",
    it: "Modalità effetto petali", ru: "Режим эффекта лепестков", ja: "花びらエフェクトモード", ko: "꽃잎 효과 모드", zh: "花瓣效果模式",
    ar: "وضع تأثير بتلات الزهور", hi: "पंखुड़ी प्रभाव मोड", tr: "Taç Yaprağı Efekti Modu", sw: "Njia ya Athari ya Petali", bn: "পাপড়ি প্রভাব মোড",
    id: "Mode Efek Kelopak", yo: "Ipò Àbájáde Ẹ̀wù Odòdó", nl: "Bloemblaadjes effectmodus", th: "โหมดเอฟเฟกต์กลีบดอกไม้", ur: "پنکھڑیوں کا اثر موڈ"
  },
  interfaceSnowySpeed: {
    en: "Snow Speed", pt: "Velocidade da Neve", es: "Velocidad de Nieve", fr: "Vitesse de neige", de: "Schneegeschwindigkeit",
    it: "Velocità neve", ru: "Скорость снега", ja: "雪の速度", ko: "눈 속도", zh: "雪花速度",
    ar: "سرعة الثلج", hi: "बर्फ की गति", tr: "Kar Hızı", sw: "Kasi ya Theluji", bn: "তুষার গতি",
    id: "Kecepatan Salju", yo: "Iyara Yìnyín", nl: "Sneeuwsnelheid", th: "ความเร็วหิมะ", ur: "برف کی رفتار"
  },
  interfaceRainSpeed: {
    en: "Rain Speed", pt: "Velocidade da Chuva", es: "Velocidad de Lluvia", fr: "Vitesse de pluie", de: "Regengeschwindigkeit",
    it: "Velocità pioggia", ru: "Скорость дождя", ja: "雨の速度", ko: "비 속도", zh: "雨滴速度",
    ar: "سرعة المطر", hi: "बारिश की गति", tr: "Yağmur Hızı", sw: "Kasi ya Mvua", bn: "বৃষ্টির গতি",
    id: "Kecepatan Hujan", yo: "Iyara Òjò", nl: "Regensnelheid", th: "ความเร็วฝน", ur: "بارش کی رفتار"
  },
  interfacePetalsSpeed: {
    en: "Petals Speed", pt: "Velocidade das Pétalas", es: "Velocidad de Pétalos", fr: "Vitesse de pétales", de: "Blütenblattgeschwindigkeit",
    it: "Velocità petali", ru: "Скорость лепестков", ja: "花びらの速度", ko: "꽃잎 속도", zh: "花瓣速度",
    ar: "سرعة بتلات الزهور", hi: "पंखुड़ी की गति", tr: "Taç Yaprağı Hızı", sw: "Kasi ya Petali", bn: "পাপড়ির গতি",
    id: "Kecepatan Kelopak", yo: "Iyara Ẹ̀wù Odòdó", nl: "Bloemblaadjes snelheid", th: "ความเร็วกลีบดอกไม้", ur: "پنکھڑیوں کی رفتار"
  },
  interfaceSnowyAmount: {
    en: "Snow Density", pt: "Densidade da Neve", es: "Densidad de Nieve", fr: "Densité de neige", de: "Schneedichte",
    it: "Densità neve", ru: "Плотность снега", ja: "雪の密度", ko: "눈 밀도", zh: "雪花密度",
    ar: "كثافة الثلج", hi: "बर्फ घनत्व", tr: "Kar Yoğunluğu", sw: "Msongamano wa Theluji", bn: "তুষার ঘনত্ব",
    id: "Kepadatan Salju", yo: "Ìwọ̀n Yìnyín", nl: "Sneeuwdichtheid", th: "ความหนาแน่นหิมะ", ur: "برف کثافت"
  },
  interfaceRainAmount: {
    en: "Rain Density", pt: "Densidade da Chuva", es: "Densidad de Lluvia", fr: "Densité de pluie", de: "Regendichte",
    it: "Densità pioggia", ru: "Плотность дождя", ja: "雨の密度", ko: "비 밀도", zh: "雨滴密度",
    ar: "كثافة المطر", hi: "बारिश घनत्व", tr: "Yağmur Yoğunluğu", sw: "Msongamano wa Mvua", bn: "বৃষ্টির ঘনত্ব",
    id: "Kepadatan Hujan", yo: "Ìwọ̀n Òjò", nl: "Regendichtheid", th: "ความหนาแน่นฝน", ur: "بارش کثافت"
  },
  interfacePetalsAmount: {
    en: "Petals Density", pt: "Densidade das Pétalas", es: "Densidad de Pétalos", fr: "Densité de pétales", de: "Blütenblattdichte",
    it: "Densità petali", ru: "Плотность лепестков", ja: "花びらの密度", ko: "꽃잎 밀도", zh: "花瓣密度",
    ar: "كثافة بتلات الزهور", hi: "पंखुड़ी घनत्व", tr: "Taç Yaprağı Yoğunluğu", sw: "Msongamano wa Petali", bn: "পাপড়ির ঘনত্ব",
    id: "Kepadatan Kelopak", yo: "Ìwọ̀n Ẹ̀wù Odòdó", nl: "Bloemblaadjes dichtheid", th: "ความหนาแน่นกลีบดอกไม้", ur: "پنکھڑیوں کی کثافت"
  },
  syncInterfaceWithReading: {
    en: "Sync Interface with Reading", pt: "Sincronizar Interface com Leitura", es: "Sincronizar Interfaz con Lectura", fr: "Synchroniser l'interface avec la lecture", de: "Oberfläche mit Lektüre synchronisieren",
    it: "Sincronizza interfaccia con lettura", ru: "Синхронизация интерфейса с чтением", ja: "インターフェースと読書領域の同期", ko: "인터페이스 및 읽기 영역 동기화", zh: "将界面与阅读区域同步",
    ar: "مزامنة الواجهة مع القراءة", hi: "इंटरफ़ेस को पठन के साथ सिंक करें", tr: "Arayüzü Okumayla Senkronize Et", sw: "Sawazisha Kiolesura na Usomaji", bn: "পড়ার সাথে ইন্টারফেস সিঙ্ক করুন",
    id: "Sinkronkan Antarmuka dengan Membaca", yo: "Muu Oju-ọna ba Kika mu", nl: "Synchroniseer interface met lezen", th: "ซิงค์อินเทอร์เฟซกับการอ่าน", ur: "انٹرفیس کو پڑھنے کے ساتھ ہم آہنگ کریں"
  },
  fixedTopBar: {
    en: "Fixed Top Bar", pt: "Barra Superior Fixa", es: "Barra Superior Fija", fr: "Barre supérieure fixe", de: "Feste obere Leiste",
    it: "Barra superiore fissa", ru: "Фиксированная верхняя панель", ja: "トップバー固定", ko: "상단 바 고정", zh: "固定顶部栏",
    ar: "شريط علوي ثابت", hi: "निश्चित शीर्ष बार", tr: "Sabit Üst Çubuk", sw: "Upau wa Juu Usiobadilika", bn: "স্থির শীর্ষ বার",
    id: "Bilah Atas Tetap", yo: "Pẹpẹ Oke Ti o duro", nl: "Vaste bovenbalk", th: "แถบด้านบนแบบตรึง", ur: "فکسڈ ٹاپ بار"
  }
};

const CHAPTER_LABEL_MAP: Record<string, string> = {
  en: "Page",
  pt: "Página",
  es: "Página",
  fr: "Page",
  de: "Seite",
  it: "Pagina",
  ru: "Страница",
  ja: "P.",
  zh: "第",
  ko: "제",
  ar: "صفحة",
  hi: "पृष्ठ",
  tr: "Sayfa",
  sw: "Ukurasa",
  bn: "পৃষ্ঠা",
  id: "Halaman",
  yo: "Oju-iwe",
  nl: "Pagina",
  th: "หน้า",
  ur: "صفحہ"
};

const BOOKMARK_LABEL_MAP: Record<string, string> = {
  en: 'Bookmark', pt: 'Marcador', es: 'Marcador', fr: 'Signet', de: 'Lesezeichen',
  it: 'Segnalibro', ru: 'Закладка', ja: 'ブックマーク', ko: '북마크', zh: '书签',
  ar: 'إشارة مرجعية', hi: 'बुकमार्क', tr: 'Yer İşareti', sw: 'Alama', bn: 'বুকমার্ক',
  id: 'Penanda', yo: 'Àmì Ìwé', nl: 'Bladwijzer', th: 'ที่คั่นหน้า', ur: 'بک مارک'
};

export const translateLog = (log: ActivityLog, rawLang: string): string => {
  const lang = (rawLang && ENABLED_DISABLED_MAP[rawLang]) ? rawLang : 'en';
  
  switch (log.type) {
    case 'read_chapter': {
      const chPrefix = CHAPTER_LABEL_MAP[lang] || CHAPTER_LABEL_MAP.en;
      const chNum = (log.chapterIndex ?? 0) + 1;
      const defaultTitle = (lang === 'ja' || lang === 'zh') ? `${chPrefix}${chNum}章` : (lang === 'ko') ? `${chPrefix} ${chNum}장` : `${chPrefix} ${chNum}`;
      const chapterLabel = log.chapterTitle || defaultTitle;
      const template = ACTION_TEMPLATES.read_chapter[lang] || ACTION_TEMPLATES.read_chapter.en;
      return template.replace('{chapter}', chapterLabel).replace('{book}', log.bookTitle || '');
    }
      
    case 'create_bookmark': {
      const bmDefault = BOOKMARK_LABEL_MAP[lang] || BOOKMARK_LABEL_MAP.en;
      const template = ACTION_TEMPLATES.create_bookmark[lang] || ACTION_TEMPLATES.create_bookmark.en;
      return template.replace('{book}', log.bookTitle || '').replace('{chapter}', log.chapterTitle || bmDefault);
    }
      
    case 'delete_bookmark': {
      const template = ACTION_TEMPLATES.delete_bookmark[lang] || ACTION_TEMPLATES.delete_bookmark.en;
      return template.replace('{book}', log.bookTitle || '');
    }
      
    case 'change_setting': {
      let keyName = '';
      if (log.settingKey) {
        const dict = SETTING_NAMES_MAP[log.settingKey];
        if (dict && (dict[lang] || dict.en)) {
          keyName = dict[lang] || dict.en;
        } else if ((readerSettingsTranslations as any)[lang]?.[log.settingKey]) {
          keyName = (readerSettingsTranslations as any)[lang][log.settingKey];
        } else if ((readerSettingsTranslations as any).en?.[log.settingKey]) {
          keyName = (readerSettingsTranslations as any).en[log.settingKey];
        } else {
          keyName = String(log.settingKey);
        }
      }
      
      const formatVal = (v: any) => {
        if (v === true) {
          const pair = ENABLED_DISABLED_MAP[lang] || ENABLED_DISABLED_MAP.en;
          return pair.enabled;
        }
        if (v === false) {
          const pair = ENABLED_DISABLED_MAP[lang] || ENABLED_DISABLED_MAP.en;
          return pair.disabled;
        }
        if (v === null || v === undefined) {
          return '-';
        }
        if (typeof v === 'string') {
          const valDict = VALUE_TRANSLATIONS_MAP[v.toLowerCase()];
          if (valDict && (valDict[lang] || valDict.en)) {
            return valDict[lang] || valDict.en;
          }
          if ((readerSettingsTranslations as any)[lang]?.[v]) {
            return (readerSettingsTranslations as any)[lang][v];
          }
          if ((readerSettingsTranslations as any).en?.[v]) {
            return (readerSettingsTranslations as any).en[v];
          }
        }
        return String(v);
      };
      
      const template = ACTION_TEMPLATES.change_setting[lang] || ACTION_TEMPLATES.change_setting.en;
      return template
        .replace('{setting}', keyName)
        .replace('{prev}', formatVal(log.settingPrevValue))
        .replace('{next}', formatVal(log.settingNewValue));
    }
      
    case 'translate_book': {
      const langName = log.targetLang ? log.targetLang.toUpperCase() : '';
      const template = ACTION_TEMPLATES.translate_book[lang] || ACTION_TEMPLATES.translate_book.en;
      return template.replace('{book}', log.bookTitle || '').replace('{lang}', langName);
    }
      
    case 'add_book': {
      const template = ACTION_TEMPLATES.add_book[lang] || ACTION_TEMPLATES.add_book.en;
      return template.replace('{book}', log.bookTitle || '');
    }
      
    default:
      return '';
  }
};

export const getActivityLogs = (): ActivityLog[] => {
  if (typeof window === 'undefined') return [];
  try {
    const username = getUsername() || 'default';
    const logsKey = `activity_logs_${username}`;
    const raw = localStorage.getItem(logsKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const revertSettingActivity = async (log: ActivityLog): Promise<boolean> => {
  if (log.type !== 'change_setting' || !log.settingKey) return false;
  try {
    const currentPrefs = await getPreferences();
    if (!currentPrefs) return false;
    
    const updatedPrefs = {
      ...currentPrefs,
      [log.settingKey]: log.settingPrevValue
    };
    
    await savePreferences(updatedPrefs);
    
    // Log the revert as a new setting event with opposite values
    logActivity({
      type: 'change_setting',
      settingKey: log.settingKey,
      settingPrevValue: log.settingNewValue,
      settingNewValue: log.settingPrevValue
    });
    
    return true;
  } catch (err) {
    console.error('Failed to revert setting:', err);
    return false;
  }
};
