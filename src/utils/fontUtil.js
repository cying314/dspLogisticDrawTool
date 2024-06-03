let dataFonts = [
  { ch: "宋体", en: "SimSun" },
  { ch: "丁卯点阵体-7px", en: "DINKIEBITMAP 7PX" },
  { ch: "丁卯点阵体-9px", en: "DINKIEBITMAP 9PX" },
  { ch: "微软雅黑", en: "Microsoft Yahei" },
  { ch: "微软正黑体", en: "Microsoft JhengHei" },
  { ch: "苹方", en: "PingFang SC" },
  { ch: "黑体", en: "SimHei" },
  { ch: "楷体", en: "KaiTi" },
  { ch: "新宋体", en: "NSimSun" },
  { ch: "仿宋", en: "FangSong" },
  { ch: "幼圆", en: "YouYuan" },
  { ch: "隶书", en: "LiSu" },
  { ch: "华文黑体", en: "STHeiti" },
  { ch: "华文细黑", en: "STXihei" },
  { ch: "华文楷体", en: "STKaiti" },
  { ch: "华文宋体", en: "STSong" },
  { ch: "华文仿宋", en: "STFangsong" },
  { ch: "华文中宋", en: "STZhongsong" },
  { ch: "华文彩云", en: "STCaiyun" },
  { ch: "华文琥珀", en: "STHupo" },
  { ch: "华文新魏", en: "STXinwei" },
  { ch: "华文隶书", en: "STLiti" },
  { ch: "华文行楷", en: "STXingkai" },
  { ch: "方正舒体", en: "FZShuTi" },
  { ch: "方正姚体", en: "FZYaoti" },
];

const testChar = "A|文"; // 用于检测差异的字符
const fontSize = 24;
const canvasWidth = 50;
const canvasHeight = 26;

let ctx = getCanvasContext();
/** 本机拥有的所有字体名称 */
export const supportFontNames = new Set();
/** 本机拥有的字体列表 */
export const fonts = dataFonts.filter((font) => {
  let support = isSupportFontFamily(font.en, ctx);
  if (support) supportFontNames.add(font.ch);
  return support;
});
ctx = null;

function getCanvasContext() {
  let canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  return canvas.getContext("2d", { willReadFrequently: true });
}

/**
 * 判断本机是否有指定名称字体
 * @param {string} fontName 字体名称
 */
export function isSupportFontFamily(fontName, canvasContext) {
  if (typeof fontName !== "string") return false;
  const baseFont = "arial"; // 基础字体
  fontName = fontName.toLowerCase();
  if (fontName === baseFont) return true;
  if (supportFontNames.has(fontName)) return true;

  if (canvasContext == null) {
    canvasContext = getCanvasContext();
  }
  canvasContext.textAlign = "center";
  canvasContext.fillStyle = "black";
  canvasContext.textBaseline = "middle";
  canvasContext.willReadFrequently = true;

  // 基于基础字体绘制
  canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
  canvasContext.font = fontSize + "px " + baseFont;
  canvasContext.fillText(testChar, canvasWidth / 2, canvasHeight / 2);
  let baseImageData = canvasContext.getImageData(0, 0, canvasWidth, canvasHeight).data;

  // 基于目标字体绘制
  canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
  canvasContext.font = fontSize + "px '" + fontName + "', " + baseFont; // 若无该字体使用基础字体
  canvasContext.fillText(testChar, canvasWidth / 2, canvasHeight / 2);
  let checkImageData = canvasContext.getImageData(0, 0, canvasWidth, canvasHeight).data;

  // 对比像素差异
  for (let i = 0; i < baseImageData.length; i++) {
    if (baseImageData[i] !== checkImageData[i]) {
      supportFontNames.add(fontName);
      return true; // 存在差异则认为有该字体
    }
  }
  return false;
}
