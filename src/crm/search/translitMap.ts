/**
 * Arabic ↔ Latin Name Transliteration Map
 * ========================================
 * Bidirectional mapping of common Arabic names and their English
 * transliteration variants. Used for cross-script search:
 * typing "Mohammed" finds contacts named "محمد" and vice versa.
 *
 * 200+ entries covering the most common first names and family names
 * across Jordan, UAE, KSA, Egypt, and Iraq.
 */

export interface TranslitEntry {
  ar: string;
  variants: string[];
}

export const ARABIC_NAME_MAP: TranslitEntry[] = [
  // ─── MALE FIRST NAMES ─────────────────────────────────
  { ar: 'محمد', variants: ['Mohammed', 'Muhammad', 'Mohamed', 'Mohammad', 'Muhammed', 'Mohamad'] },
  { ar: 'أحمد', variants: ['Ahmed', 'Ahmad', 'Ahamed'] },
  { ar: 'علي', variants: ['Ali', 'Aly', 'Alee'] },
  { ar: 'عبدالله', variants: ['Abdullah', 'Abdallah', 'Abdalla', 'Abdellah'] },
  { ar: 'عبدالرحمن', variants: ['Abdulrahman', 'Abdul Rahman', 'Abdelrahman', 'Abd al-Rahman'] },
  { ar: 'عبدالعزيز', variants: ['Abdulaziz', 'Abdul Aziz', 'Abdelaziz', 'Abd al-Aziz'] },
  { ar: 'خالد', variants: ['Khaled', 'Khalid', 'Khalead'] },
  { ar: 'عمر', variants: ['Omar', 'Umar', 'Omer'] },
  { ar: 'يوسف', variants: ['Youssef', 'Yousef', 'Yusuf', 'Joseph', 'Yousif', 'Yusef'] },
  { ar: 'إبراهيم', variants: ['Ibrahim', 'Ibraheem', 'Abraham', 'Ebrahim'] },
  { ar: 'حسن', variants: ['Hassan', 'Hasan', 'Hasen'] },
  { ar: 'حسين', variants: ['Hussein', 'Hussain', 'Husain', 'Hossein', 'Husein'] },
  { ar: 'طارق', variants: ['Tariq', 'Tarek', 'Tareq', 'Tarik'] },
  { ar: 'كريم', variants: ['Karim', 'Kareem', 'Kaream'] },
  { ar: 'سامي', variants: ['Sami', 'Samie', 'Samy'] },
  { ar: 'ياسر', variants: ['Yasser', 'Yaser', 'Yasir', 'Yasser'] },
  { ar: 'ماجد', variants: ['Majed', 'Majid', 'Maged'] },
  { ar: 'فيصل', variants: ['Faisal', 'Faysal', 'Feisal'] },
  { ar: 'سعود', variants: ['Saud', 'Saoud', 'Sauod'] },
  { ar: 'سلطان', variants: ['Sultan', 'Soltan'] },
  { ar: 'نايف', variants: ['Naif', 'Nayef', 'Nayif'] },
  { ar: 'بدر', variants: ['Badr', 'Bader', 'Bedr'] },
  { ar: 'سعد', variants: ['Saad', 'Saed', 'Sad'] },
  { ar: 'فهد', variants: ['Fahd', 'Fahad', 'Fahed'] },
  { ar: 'تركي', variants: ['Turki', 'Torki', 'Turkey'] },
  { ar: 'مشعل', variants: ['Mishal', 'Meshal', 'Mishaal'] },
  { ar: 'عادل', variants: ['Adel', 'Adil', 'Adeel'] },
  { ar: 'حمد', variants: ['Hamad', 'Hamd'] },
  { ar: 'ناصر', variants: ['Nasser', 'Naser', 'Nasir', 'Nassir'] },
  { ar: 'رائد', variants: ['Raed', 'Raid', 'Raeed'] },
  { ar: 'وليد', variants: ['Walid', 'Waleed', 'Waled'] },
  { ar: 'سالم', variants: ['Salem', 'Salim', 'Saleem'] },
  { ar: 'جمال', variants: ['Jamal', 'Gamal', 'Jamaal'] },
  { ar: 'حمزة', variants: ['Hamza', 'Hamzah', 'Hamzeh'] },
  { ar: 'زياد', variants: ['Ziad', 'Ziyad', 'Zyad'] },
  { ar: 'عمار', variants: ['Ammar', 'Amar', 'Ammer'] },
  { ar: 'مصطفى', variants: ['Mustafa', 'Mostafa', 'Mustapha'] },
  { ar: 'عثمان', variants: ['Othman', 'Osman', 'Uthman'] },
  { ar: 'هشام', variants: ['Hisham', 'Hesham', 'Hicham'] },
  { ar: 'رامي', variants: ['Rami', 'Ramy'] },
  { ar: 'باسل', variants: ['Basel', 'Basil', 'Baseel'] },
  { ar: 'معاذ', variants: ['Muath', 'Moath', 'Muaz', 'Moaz'] },
  { ar: 'عبدالملك', variants: ['Abdulmalik', 'Abdul Malik', 'Abdelmalek'] },
  { ar: 'بلال', variants: ['Bilal', 'Belal', 'Bilaal'] },
  { ar: 'أسامة', variants: ['Osama', 'Usama', 'Osamah'] },
  { ar: 'ايمن', variants: ['Ayman', 'Aiman', 'Aymen'] },
  { ar: 'مازن', variants: ['Mazen', 'Mazin', 'Mazn'] },
  { ar: 'فادي', variants: ['Fadi', 'Fady'] },
  { ar: 'أنس', variants: ['Anas', 'Anass', 'Anes'] },
  { ar: 'عاصم', variants: ['Asim', 'Asem', 'Assim'] },
  { ar: 'منصور', variants: ['Mansour', 'Mansoor', 'Mansur'] },
  { ar: 'صالح', variants: ['Saleh', 'Salih', 'Salah'] },
  { ar: 'جابر', variants: ['Jaber', 'Jabir', 'Gaber'] },
  { ar: 'نبيل', variants: ['Nabil', 'Nabeel', 'Nabeil'] },
  { ar: 'هاني', variants: ['Hani', 'Hany'] },
  { ar: 'شادي', variants: ['Shadi', 'Shady', 'Chadi'] },
  { ar: 'رشيد', variants: ['Rashid', 'Rachid', 'Rasheed'] },
  { ar: 'عماد', variants: ['Imad', 'Emad', 'Imed'] },
  { ar: 'قاسم', variants: ['Qasem', 'Qasim', 'Kassem', 'Qassem'] },
  { ar: 'سليمان', variants: ['Sulaiman', 'Suleiman', 'Soliman', 'Solomon'] },
  { ar: 'داود', variants: ['Daoud', 'Dawoud', 'Dawud', 'David'] },
  { ar: 'موسى', variants: ['Musa', 'Mousa', 'Moses'] },
  { ar: 'عيسى', variants: ['Issa', 'Eisa', 'Isa'] },
  { ar: 'يحيى', variants: ['Yahya', 'Yehya', 'Yahia'] },
  { ar: 'نور', variants: ['Nour', 'Noor', 'Nur', 'Noor'] },
  { ar: 'أمين', variants: ['Amin', 'Ameen', 'Amine'] },
  { ar: 'سيف', variants: ['Saif', 'Seif', 'Sayf'] },
  { ar: 'مهند', variants: ['Muhannad', 'Mohannad', 'Mohanad'] },
  { ar: 'عبدالكريم', variants: ['Abdulkarim', 'Abdul Karim', 'Abdelkarim'] },
  { ar: 'عبدالحميد', variants: ['Abdulhamid', 'Abdul Hamid', 'Abdelhamid'] },
  { ar: 'عبدالرزاق', variants: ['Abdulrazaq', 'Abdul Razaq', 'Abdelrazak'] },

  // ─── FEMALE FIRST NAMES ─────────────────────────────────
  { ar: 'فاطمة', variants: ['Fatima', 'Fatma', 'Fatimah', 'Fatmeh'] },
  { ar: 'عائشة', variants: ['Aisha', 'Aysha', 'Aicha', 'Ayesha'] },
  { ar: 'مريم', variants: ['Maryam', 'Mariam', 'Miriam'] },
  { ar: 'نورة', variants: ['Noura', 'Nora', 'Nourah'] },
  { ar: 'سارة', variants: ['Sarah', 'Sara'] },
  { ar: 'ليلى', variants: ['Layla', 'Leila', 'Laila', 'Lila'] },
  { ar: 'هند', variants: ['Hind', 'Hend'] },
  { ar: 'رنا', variants: ['Rana', 'Rna'] },
  { ar: 'دانة', variants: ['Dana', 'Danah'] },
  { ar: 'لينا', variants: ['Lina', 'Leena', 'Linah'] },
  { ar: 'ريم', variants: ['Reem', 'Rim', 'Rima'] },
  { ar: 'منى', variants: ['Mona', 'Muna', 'Mouna'] },
  { ar: 'هدى', variants: ['Huda', 'Houda', 'Hoda'] },
  { ar: 'أمل', variants: ['Amal', 'Amel'] },
  { ar: 'سلمى', variants: ['Salma', 'Selma'] },
  { ar: 'رغد', variants: ['Raghad', 'Raghd'] },
  { ar: 'جنى', variants: ['Jana', 'Gana', 'Janna'] },
  { ar: 'ياسمين', variants: ['Yasmin', 'Yasmine', 'Yasmeen', 'Jasmine'] },
  { ar: 'هالة', variants: ['Hala', 'Halah'] },
  { ar: 'سمر', variants: ['Samar', 'Samer'] },
  { ar: 'ديما', variants: ['Dima', 'Deema', 'Dimah'] },
  { ar: 'لمى', variants: ['Lama', 'Lamah'] },
  { ar: 'عبير', variants: ['Abeer', 'Abir', 'Abear'] },
  { ar: 'وفاء', variants: ['Wafaa', 'Wafa'] },
  { ar: 'سهام', variants: ['Siham', 'Seham', 'Suham'] },
  { ar: 'نجلاء', variants: ['Naglaa', 'Najla', 'Najlaa'] },
  { ar: 'زينب', variants: ['Zainab', 'Zeinab', 'Zaynab'] },
  { ar: 'خديجة', variants: ['Khadija', 'Khadijah', 'Khadiga'] },
  { ar: 'آمنة', variants: ['Amna', 'Amina', 'Aminah'] },
  { ar: 'رقية', variants: ['Ruqayya', 'Roqaya', 'Ruqia'] },
  { ar: 'سمية', variants: ['Sumaya', 'Somaya', 'Soumaya'] },
  { ar: 'شيماء', variants: ['Shaimaa', 'Shaima', 'Shimaa'] },
  { ar: 'بسمة', variants: ['Basma', 'Basmah', 'Besma'] },
  { ar: 'إيمان', variants: ['Iman', 'Eman', 'Eiman'] },

  // ─── COMMON FAMILY NAMES ─────────────────────────────────
  { ar: 'الهادي', variants: ['Al-Hadi', 'Alhadi', 'El-Hadi'] },
  { ar: 'المصري', variants: ['Al-Masri', 'Almasri', 'El-Masry', 'Elmasry'] },
  { ar: 'الأحمد', variants: ['Al-Ahmad', 'Alahmad', 'El-Ahmed'] },
  { ar: 'الحسين', variants: ['Al-Hussein', 'Alhussein', 'El-Husein'] },
  { ar: 'العلي', variants: ['Al-Ali', 'Alali', 'El-Ali'] },
  { ar: 'الخليل', variants: ['Al-Khalil', 'Alkhalil', 'El-Khalil'] },
  { ar: 'الشريف', variants: ['Al-Sharif', 'Alsharif', 'El-Sherif', 'Elsherif'] },
  { ar: 'القاسم', variants: ['Al-Qasim', 'Alqasim', 'El-Kassem'] },
  { ar: 'الحربي', variants: ['Al-Harbi', 'Alharbi', 'El-Harby'] },
  { ar: 'الغامدي', variants: ['Al-Ghamdi', 'Alghamdi'] },
  { ar: 'العتيبي', variants: ['Al-Otaibi', 'Alotaibi', 'Alutaibi'] },
  { ar: 'القحطاني', variants: ['Al-Qahtani', 'Alqahtani'] },
  { ar: 'الدوسري', variants: ['Al-Dosari', 'Aldosari', 'Al-Dossari'] },
  { ar: 'الشمري', variants: ['Al-Shammari', 'Alshammari'] },
  { ar: 'المطيري', variants: ['Al-Mutairi', 'Almutairi'] },
  { ar: 'الزهراني', variants: ['Al-Zahrani', 'Alzahrani'] },
  { ar: 'البلوشي', variants: ['Al-Balushi', 'Albalushi'] },
  { ar: 'الكعبي', variants: ['Al-Kaabi', 'Alkaabi'] },
  { ar: 'المنصوري', variants: ['Al-Mansoori', 'Almansoori'] },
  { ar: 'النعيمي', variants: ['Al-Nuaimi', 'Alnuaimi'] },
  { ar: 'الهاشمي', variants: ['Al-Hashimi', 'Alhashimi', 'El-Hashmi'] },
  { ar: 'الرشيدي', variants: ['Al-Rashidi', 'Alrashidi'] },
  { ar: 'السيد', variants: ['Al-Sayed', 'Alsayed', 'El-Sayed', 'Elsayed'] },
  { ar: 'الخطيب', variants: ['Al-Khatib', 'Alkhatib', 'El-Khatib'] },
  { ar: 'الحمد', variants: ['Al-Hamad', 'Alhamad'] },
  { ar: 'العمري', variants: ['Al-Omari', 'Alomari', 'El-Omary'] },
  { ar: 'السالم', variants: ['Al-Salem', 'Alsalem', 'El-Salem'] },
  { ar: 'الجابري', variants: ['Al-Jabri', 'Aljabri'] },
  { ar: 'البكري', variants: ['Al-Bakri', 'Albakri', 'El-Bakry'] },
  { ar: 'العبدالله', variants: ['Al-Abdullah', 'Alabdullah'] },
  { ar: 'الحداد', variants: ['Al-Haddad', 'Alhaddad', 'El-Haddad'] },
  { ar: 'النجار', variants: ['Al-Najjar', 'Alnajjar', 'El-Naggar'] },
  { ar: 'الصالح', variants: ['Al-Saleh', 'Alsaleh', 'El-Saleh'] },
  { ar: 'العبيدي', variants: ['Al-Obaidi', 'Alobaidi', 'El-Obedy'] },
  { ar: 'الربيعي', variants: ['Al-Rubai', 'Alrubaie', 'El-Rubaiey'] },
  { ar: 'السعدي', variants: ['Al-Saadi', 'Alsaadi', 'El-Saady'] },
  { ar: 'الجبوري', variants: ['Al-Jubouri', 'Aljubouri'] },
  { ar: 'التميمي', variants: ['Al-Tamimi', 'Altamimi', 'El-Tamimy'] },
  { ar: 'الخزرجي', variants: ['Al-Khazraji', 'Alkhazraji'] },

  // ─── COMMON COMPANY-RELATED WORDS ───────────────────────
  { ar: 'شركة', variants: ['Company', 'Sharika', 'Sherka'] },
  { ar: 'مؤسسة', variants: ['Establishment', 'Muassasa', 'Foundation'] },
  { ar: 'مجموعة', variants: ['Group', 'Majmoua'] },
  { ar: 'بنك', variants: ['Bank'] },
  { ar: 'مصرف', variants: ['Bank', 'Masraf'] },
  { ar: 'للتجارة', variants: ['Trading', 'Commerce'] },
  { ar: 'للاستثمار', variants: ['Investment'] },
  { ar: 'للتطوير', variants: ['Development'] },
  { ar: 'العقارية', variants: ['Real Estate'] },
  { ar: 'للتكنولوجيا', variants: ['Technology', 'Tech'] },
];

// ─── LOOKUP INDEXES ─────────────────────────────────────

// Build reverse map: Latin variant → Arabic name(s)
const latinToArabicMap = new Map<string, string[]>();
const arabicToLatinMap = new Map<string, string[]>();

for (const entry of ARABIC_NAME_MAP) {
  // Arabic → Latin variants
  arabicToLatinMap.set(entry.ar, entry.variants);

  // Each Latin variant → Arabic entry
  for (const variant of entry.variants) {
    const key = variant.toLowerCase();
    const existing = latinToArabicMap.get(key) || [];
    if (!existing.includes(entry.ar)) {
      existing.push(entry.ar);
    }
    latinToArabicMap.set(key, existing);
  }
}

/**
 * Given a Latin name, find the Arabic equivalent(s).
 */
export function findArabicForLatin(latin: string): string[] {
  return latinToArabicMap.get(latin.toLowerCase()) || [];
}

/**
 * Given an Arabic name, find the Latin transliteration variants.
 */
export function findLatinForArabic(arabic: string): string[] {
  return arabicToLatinMap.get(arabic) || [];
}

/**
 * Expand a search query by finding cross-script equivalents.
 * Returns additional terms to include in the search.
 */
export function expandSearchQuery(query: string): string[] {
  const terms = query.trim().split(/\s+/);
  const expansions: string[] = [];

  for (const term of terms) {
    const lower = term.toLowerCase();

    // Try Latin → Arabic
    const arabicMatches = findArabicForLatin(lower);
    expansions.push(...arabicMatches);

    // Try Arabic → Latin
    const latinMatches = findLatinForArabic(term);
    expansions.push(...latinMatches.map(v => v.toLowerCase()));
  }

  return [...new Set(expansions)];
}
