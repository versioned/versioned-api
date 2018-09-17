const list = [
  {
    code: 'aa',
    name: 'Afar'
  },
  {
    code: 'ab',
    name: 'Abkhazian'
  },
  {
    code: 'af',
    name: 'Afrikaans'
  },
  {
    code: 'ak',
    name: 'Akan'
  },
  {
    code: 'sq',
    name: 'Albanian'
  },
  {
    code: 'am',
    name: 'Amharic'
  },
  {
    code: 'ar',
    name: 'Arabic'
  },
  {
    code: 'an',
    name: 'Aragonese'
  },
  {
    code: 'hy',
    name: 'Armenian'
  },
  {
    code: 'as',
    name: 'Assamese'
  },
  {
    code: 'av',
    name: 'Avaric'
  },
  {
    code: 'ae',
    name: 'Avestan'
  },
  {
    code: 'ay',
    name: 'Aymara'
  },
  {
    code: 'az',
    name: 'Azerbaijani'
  },
  {
    code: 'ba',
    name: 'Bashkir'
  },
  {
    code: 'bm',
    name: 'Bambara'
  },
  {
    code: 'eu',
    name: 'Basque'
  },
  {
    code: 'be',
    name: 'Belarusian'
  },
  {
    code: 'bn',
    name: 'Bengali'
  },
  {
    code: 'bh',
    name: 'Bihari languages'
  },
  {
    code: 'bi',
    name: 'Bislama'
  },
  {
    code: 'bs',
    name: 'Bosnian'
  },
  {
    code: 'br',
    name: 'Breton'
  },
  {
    code: 'bg',
    name: 'Bulgarian'
  },
  {
    code: 'my',
    name: 'Burmese'
  },
  {
    code: 'ca',
    name: 'Catalan; Valencian'
  },
  {
    code: 'ch',
    name: 'Chamorro'
  },
  {
    code: 'ce',
    name: 'Chechen'
  },
  {
    code: 'zh',
    name: 'Chinese'
  },
  {
    code: 'cu',
    name: 'Church Slavic; Old Slavonic; Church Slavonic; Old Bulgarian; Old Church Slavonic'
  },
  {
    code: 'cv',
    name: 'Chuvash'
  },
  {
    code: 'kw',
    name: 'Cornish'
  },
  {
    code: 'co',
    name: 'Corsican'
  },
  {
    code: 'cr',
    name: 'Cree'
  },
  {
    code: 'cs',
    name: 'Czech'
  },
  {
    code: 'da',
    name: 'Danish'
  },
  {
    code: 'dv',
    name: 'Divehi; Dhivehi; Maldivian'
  },
  {
    code: 'nl',
    name: 'Dutch'
  },
  {
    code: 'dz',
    name: 'Dzongkha'
  },
  {
    code: 'en',
    name: 'English'
  },
  {
    code: 'eo',
    name: 'Esperanto'
  },
  {
    code: 'et',
    name: 'Estonian'
  },
  {
    code: 'ee',
    name: 'Ewe'
  },
  {
    code: 'fo',
    name: 'Faroese'
  },
  {
    code: 'fj',
    name: 'Fijian'
  },
  {
    code: 'fi',
    name: 'Finnish'
  },
  {
    code: 'fr',
    name: 'French'
  },
  {
    code: 'fy',
    name: 'Western Frisian'
  },
  {
    code: 'ff',
    name: 'Fulah'
  },
  {
    code: 'ka',
    name: 'Georgian'
  },
  {
    code: 'de',
    name: 'German'
  },
  {
    code: 'gd',
    name: 'Gaelic; Scottish Gaelic'
  },
  {
    code: 'ga',
    name: 'Irish'
  },
  {
    code: 'gl',
    name: 'Galician'
  },
  {
    code: 'gv',
    name: 'Manx'
  },
  {
    code: 'el',
    name: 'Greek, Modern (1453-)'
  },
  {
    code: 'gn',
    name: 'Guarani'
  },
  {
    code: 'gu',
    name: 'Gujarati'
  },
  {
    code: 'ht',
    name: 'Haitian; Haitian Creole'
  },
  {
    code: 'ha',
    name: 'Hausa'
  },
  {
    code: 'he',
    name: 'Hebrew'
  },
  {
    code: 'hz',
    name: 'Herero'
  },
  {
    code: 'hi',
    name: 'Hindi'
  },
  {
    code: 'ho',
    name: 'Hiri Motu'
  },
  {
    code: 'hr',
    name: 'Croatian'
  },
  {
    code: 'hu',
    name: 'Hungarian'
  },
  {
    code: 'ig',
    name: 'Igbo'
  },
  {
    code: 'is',
    name: 'Icelandic'
  },
  {
    code: 'io',
    name: 'Ido'
  },
  {
    code: 'ii',
    name: 'Sichuan Yi; Nuosu'
  },
  {
    code: 'iu',
    name: 'Inuktitut'
  },
  {
    code: 'ie',
    name: 'Interlingue; Occidental'
  },
  {
    code: 'ia',
    name: 'Interlingua (International Auxiliary Language Association)'
  },
  {
    code: 'id',
    name: 'Indonesian'
  },
  {
    code: 'ik',
    name: 'Inupiaq'
  },
  {
    code: 'it',
    name: 'Italian'
  },
  {
    code: 'jv',
    name: 'Javanese'
  },
  {
    code: 'ja',
    name: 'Japanese'
  },
  {
    code: 'kl',
    name: 'Kalaallisut; Greenlandic'
  },
  {
    code: 'kn',
    name: 'Kannada'
  },
  {
    code: 'ks',
    name: 'Kashmiri'
  },
  {
    code: 'kr',
    name: 'Kanuri'
  },
  {
    code: 'kk',
    name: 'Kazakh'
  },
  {
    code: 'km',
    name: 'Central Khmer'
  },
  {
    code: 'ki',
    name: 'Kikuyu; Gikuyu'
  },
  {
    code: 'rw',
    name: 'Kinyarwanda'
  },
  {
    code: 'ky',
    name: 'Kirghiz; Kyrgyz'
  },
  {
    code: 'kv',
    name: 'Komi'
  },
  {
    code: 'kg',
    name: 'Kongo'
  },
  {
    code: 'ko',
    name: 'Korean'
  },
  {
    code: 'kj',
    name: 'Kuanyama; Kwanyama'
  },
  {
    code: 'ku',
    name: 'Kurdish'
  },
  {
    code: 'lo',
    name: 'Lao'
  },
  {
    code: 'la',
    name: 'Latin'
  },
  {
    code: 'lv',
    name: 'Latvian'
  },
  {
    code: 'li',
    name: 'Limburgan; Limburger; Limburgish'
  },
  {
    code: 'ln',
    name: 'Lingala'
  },
  {
    code: 'lt',
    name: 'Lithuanian'
  },
  {
    code: 'lb',
    name: 'Luxembourgish; Letzeburgesch'
  },
  {
    code: 'lu',
    name: 'Luba-Katanga'
  },
  {
    code: 'lg',
    name: 'Ganda'
  },
  {
    code: 'mk',
    name: 'Macedonian'
  },
  {
    code: 'mh',
    name: 'Marshallese'
  },
  {
    code: 'ml',
    name: 'Malayalam'
  },
  {
    code: 'mi',
    name: 'Maori'
  },
  {
    code: 'mr',
    name: 'Marathi'
  },
  {
    code: 'ms',
    name: 'Malay'
  },
  {
    code: 'mg',
    name: 'Malagasy'
  },
  {
    code: 'mt',
    name: 'Maltese'
  },
  {
    code: 'mn',
    name: 'Mongolian'
  },
  {
    code: 'na',
    name: 'Nauru'
  },
  {
    code: 'nv',
    name: 'Navajo; Navaho'
  },
  {
    code: 'nr',
    name: 'Ndebele, South; South Ndebele'
  },
  {
    code: 'nd',
    name: 'Ndebele, North; North Ndebele'
  },
  {
    code: 'ng',
    name: 'Ndonga'
  },
  {
    code: 'ne',
    name: 'Nepali'
  },
  {
    code: 'nn',
    name: 'Norwegian Nynorsk; Nynorsk, Norwegian'
  },
  {
    code: 'nb',
    name: 'Bokmål, Norwegian; Norwegian Bokmål'
  },
  {
    code: 'no',
    name: 'Norwegian'
  },
  {
    code: 'ny',
    name: 'Chichewa; Chewa; Nyanja'
  },
  {
    code: 'oc',
    name: 'Occitan (post 1500); Provençal'
  },
  {
    code: 'oj',
    name: 'Ojibwa'
  },
  {
    code: 'or',
    name: 'Oriya'
  },
  {
    code: 'om',
    name: 'Oromo'
  },
  {
    code: 'os',
    name: 'Ossetian; Ossetic'
  },
  {
    code: 'pa',
    name: 'Panjabi; Punjabi'
  },
  {
    code: 'fa',
    name: 'Persian'
  },
  {
    code: 'pi',
    name: 'Pali'
  },
  {
    code: 'pl',
    name: 'Polish'
  },
  {
    code: 'pt',
    name: 'Portuguese'
  },
  {
    code: 'ps',
    name: 'Pushto; Pashto'
  },
  {
    code: 'qu',
    name: 'Quechua'
  },
  {
    code: 'rm',
    name: 'Romansh'
  },
  {
    code: 'ro',
    name: 'Romanian; Moldavian; Moldovan'
  },
  {
    code: 'rn',
    name: 'Rundi'
  },
  {
    code: 'ru',
    name: 'Russian'
  },
  {
    code: 'sg',
    name: 'Sango'
  },
  {
    code: 'sa',
    name: 'Sanskrit'
  },
  {
    code: 'si',
    name: 'Sinhala; Sinhalese'
  },
  {
    code: 'sk',
    name: 'Slovak'
  },
  {
    code: 'sl',
    name: 'Slovenian'
  },
  {
    code: 'se',
    name: 'Northern Sami'
  },
  {
    code: 'sm',
    name: 'Samoan'
  },
  {
    code: 'sn',
    name: 'Shona'
  },
  {
    code: 'sd',
    name: 'Sindhi'
  },
  {
    code: 'so',
    name: 'Somali'
  },
  {
    code: 'st',
    name: 'Sotho, Southern'
  },
  {
    code: 'es',
    name: 'Spanish'
  },
  {
    code: 'sc',
    name: 'Sardinian'
  },
  {
    code: 'sr',
    name: 'Serbian'
  },
  {
    code: 'ss',
    name: 'Swati'
  },
  {
    code: 'su',
    name: 'Sundanese'
  },
  {
    code: 'sw',
    name: 'Swahili'
  },
  {
    code: 'sv',
    name: 'Swedish'
  },
  {
    code: 'ty',
    name: 'Tahitian'
  },
  {
    code: 'ta',
    name: 'Tamil'
  },
  {
    code: 'tt',
    name: 'Tatar'
  },
  {
    code: 'te',
    name: 'Telugu'
  },
  {
    code: 'tg',
    name: 'Tajik'
  },
  {
    code: 'tl',
    name: 'Tagalog'
  },
  {
    code: 'th',
    name: 'Thai'
  },
  {
    code: 'bo',
    name: 'Tibetan'
  },
  {
    code: 'ti',
    name: 'Tigrinya'
  },
  {
    code: 'to',
    name: 'Tonga (Tonga Islands)'
  },
  {
    code: 'tn',
    name: 'Tswana'
  },
  {
    code: 'ts',
    name: 'Tsonga'
  },
  {
    code: 'tk',
    name: 'Turkmen'
  },
  {
    code: 'tr',
    name: 'Turkish'
  },
  {
    code: 'tw',
    name: 'Twi'
  },
  {
    code: 'ug',
    name: 'Uighur; Uyghur'
  },
  {
    code: 'uk',
    name: 'Ukrainian'
  },
  {
    code: 'ur',
    name: 'Urdu'
  },
  {
    code: 'uz',
    name: 'Uzbek'
  },
  {
    code: 've',
    name: 'Venda'
  },
  {
    code: 'vi',
    name: 'Vietnamese'
  },
  {
    code: 'vo',
    name: 'Volapük'
  },
  {
    code: 'cy',
    name: 'Welsh'
  },
  {
    code: 'wa',
    name: 'Walloon'
  },
  {
    code: 'wo',
    name: 'Wolof'
  },
  {
    code: 'xh',
    name: 'Xhosa'
  },
  {
    code: 'yi',
    name: 'Yiddish'
  },
  {
    code: 'yo',
    name: 'Yoruba'
  },
  {
    code: 'za',
    name: 'Zhuang; Chuang'
  },
  {
    code: 'zu',
    name: 'Zulu'
  }
]

const _codeToLanguage = list.reduce((acc, {name, code}) => {
  acc[code] = name
  return acc
}, {})

const _languageToCode = list.reduce((acc, {name, code}) => {
  acc[name] = code
  return acc
}, {})

function codeToLanguage (code) {
  return _codeToLanguage[code]
}

function languageToCode (language) {
  return _languageToCode[language]
}

module.exports = {
  list,
  codeToLanguage,
  languageToCode
}
