/**
 * 罗马音转平假名输入法字典与转换器
 * 支持标准罗马音输入，实时转换为平假名
 */

// 罗马音→平假名映射表
const romajiDict = {
  // 元音
  "a": "あ", "i": "い", "u": "う", "e": "え", "o": "お",
  "xa": "ぁ", "xi": "ぃ", "xu": "ぅ", "xe": "ぇ", "xo": "ぉ",
  "la": "ぁ", "li": "ぃ", "lu": "ぅ", "le": "ぇ", "lo": "ぉ",
  // 拗音专用小字
  "xya": "ゃ", "xyu": "ゅ", "xyo": "ょ",
  // か行
  "ka": "か", "ki": "き", "ku": "く", "ke": "け", "ko": "こ",
  "kya": "きゃ", "kyu": "きゅ", "kyo": "きょ",
  "kwa": "くゎ",
  // が行
  "ga": "が", "gi": "ぎ", "gu": "ぐ", "ge": "げ", "go": "ご",
  "gya": "ぎゃ", "gyu": "ぎゅ", "gyo": "ぎょ",
  "gwa": "ぐゎ",
  // さ行
  "sa": "さ", "shi": "し", "su": "す", "se": "せ", "so": "そ",
  "si": "し",
  "sha": "しゃ", "shu": "しゅ", "she": "しぇ", "sho": "しょ",
  "sya": "しゃ", "syu": "しゅ", "sye": "しぇ", "syo": "しょ",
  // ざ行
  "za": "ざ", "ji": "じ", "zu": "ず", "ze": "ぜ", "zo": "ぞ",
  "zi": "じ",
  "ja": "じゃ", "ju": "じゅ", "je": "じぇ", "jo": "じょ",
  "jya": "じゃ", "jyu": "じゅ", "jye": "じぇ", "jyo": "じょ",
  "zya": "じゃ", "zyu": "じゅ", "zye": "じぇ", "zyo": "じょ",
  // た行
  "ta": "た", "chi": "ち", "tsu": "つ", "te": "て", "to": "と",
  "ti": "ち", "tu": "つ", "tsu": "つ",
  "cha": "ちゃ", "chu": "ちゅ", "che": "ちぇ", "cho": "ちょ",
  "cya": "ちゃ", "cyu": "ちゅ", "cye": "ちぇ", "cyo": "ちょ",
  "tya": "ちゃ", "tyu": "ちゅ", "tye": "ちぇ", "tyo": "ちょ",
  "tha": "てゃ", "thu": "てゅ", "tho": "てょ",
  // だ行
  "da": "だ", "di": "ぢ", "du": "づ", "de": "で", "do": "ど",
  "dya": "ぢゃ", "dyu": "ぢゅ", "dyo": "ぢょ",
  "dha": "でゃ", "dhu": "でゅ", "dho": "でょ",
  // な行
  "na": "な", "ni": "に", "nu": "ぬ", "ne": "ね", "no": "の",
  "nya": "にゃ", "nyu": "にゅ", "nyo": "にょ",
  // は行
  "ha": "は", "hi": "ひ", "fu": "ふ", "he": "へ", "ho": "ほ",
  "hu": "ふ", "fa": "ふぁ", "fi": "ふぃ", "fe": "ふぇ", "fo": "ふぉ",
  "hya": "ひゃ", "hyu": "ひゅ", "hyo": "ひょ",
  "fya": "ふゃ", "fyu": "ふゅ", "fyo": "ふょ",
  // ば行
  "ba": "ば", "bi": "び", "bu": "ぶ", "be": "べ", "bo": "ぼ",
  "bya": "びゃ", "byu": "びゅ", "byo": "びょ",
  // ぱ行
  "pa": "ぱ", "pi": "ぴ", "pu": "ぷ", "pe": "ぺ", "po": "ぽ",
  "pya": "ぴゃ", "pyu": "ぴゅ", "pyo": "ぴょ",
  // ま行
  "ma": "ま", "mi": "み", "mu": "む", "me": "め", "mo": "も",
  "mya": "みゃ", "myu": "みゅ", "myo": "みょ",
  // や行
  "ya": "や", "yu": "ゆ", "yo": "よ",
  // ら行
  "ra": "ら", "ri": "り", "ru": "る", "re": "れ", "ro": "ろ",
  "rya": "りゃ", "ryu": "りゅ", "ryo": "りょ",
  // わ行
  "wa": "わ", "wo": "を", "wi": "ゐ", "we": "ゑ",
  // ん
  "n": "ん", "nn": "ん", "n'": "ん", "xn": "ん",
  // ー 长音
  "-": "ー",
  // 、。
  ",": "、", ".": "。",
  // っ (促音) 单独小つ
  "xtu": "っ", "xtsu": "っ", "ltu": "っ", "ltsu": "っ",
}

// 促音前缀对应表：促音 + 后续假名
// 标准促音写法是重复后续假名的首辅音，如 kk → っか, tt → った
// 特殊：tchi → っち (t + chi)
const sokuonConsonants = 'kgsztdpbjcr'

/**
 * 将罗马音转换为平假名
 * @param {string} str 罗马音字符串
 * @returns {string} 转换后的平假名（可能包含尚未完成的罗马音片段）
 */
function romajiToHiragana(str) {
  if (!str) return ''
  str = str.toLowerCase()
  let result = ''
  let i = 0

  while (i < str.length) {
    let matched = false

    // 1. 检查促音（っ）：重复辅音或 t+chi/tsu
    if (i + 1 < str.length) {
      // 标准重复辅音：kk, gg, ss, zz, tt, dd, pp, bb, jj, cc, rr
      if (sokuonConsonants.indexOf(str[i]) >= 0 && str[i] === str[i + 1]) {
        result += 'っ'
        i++
        continue
      }
      // 特殊：t 后接 chi → っち
      if (str[i] === 't' && str.substring(i + 1, i + 4) === 'chi') {
        result += 'っち'
        i += 4
        matched = true
      }
      // 特殊：t 后接 tsu → っつ（已由 tt 检测覆盖，但也加上以防 ttsu 之外的情况）
      if (!matched && str[i] === 't' && str.substring(i + 1, i + 4) === 'tsu') {
        result += 'っつ'
        i += 4
        matched = true
      }
    }

    // 2. 最长匹配（4→3→2→1）
    if (!matched) {
      for (let len = Math.min(4, str.length - i); len >= 1; len--) {
        var substr = str.substring(i, i + len)
        if (romajiDict[substr]) {
          result += romajiDict[substr]
          i += len
          matched = true
          break
        }
      }
    }

    // 3. 未匹配（用户仍在输入中），原样输出
    if (!matched) {
      result += str[i]
      i++
    }
  }

  return result
}

/**
 * 判断罗马音是否已产生有效假名（用于决定是否显示候选）
 * @param {string} str 罗马音字符串
 * @returns {boolean} 是否有至少一个假名被转换出来
 */
function hasKanaConverted(str) {
  if (!str) return false
  var converted = romajiToHiragana(str)
  // 转换结果与原始输入不同，说明至少有一个假名被转换
  return converted !== str.toLowerCase()
}

var RomajiInputMethod = {
  dict: romajiDict,
  getKana: romajiToHiragana,
  hasKana: hasKanaConverted,
}

export { RomajiInputMethod }
